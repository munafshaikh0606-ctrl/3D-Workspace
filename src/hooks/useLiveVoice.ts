import { useState, useRef, useCallback, useEffect } from "react";

export type LiveStatus = "idle" | "connecting" | "active" | "error";

interface UseLiveVoiceOptions {
  onUserTranscript?: (text: string) => void;
  onModelTranscript?: (text: string) => void;
  onTurnComplete?: (userText: string, modelText: string) => void;
  onError?: (message: string) => void;
}

function pcmFloat32ToBase64(float32: Float32Array): string {
  const buffer = new ArrayBuffer(float32.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function base64ToFloat32Pcm(base64: string): Float32Array {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const view = new DataView(bytes.buffer);
  const sampleCount = Math.floor(bytes.byteLength / 2);
  const float32 = new Float32Array(sampleCount);
  for (let i = 0; i < sampleCount; i++) {
    float32[i] = view.getInt16(i * 2, true) / 32768;
  }
  return float32;
}

export function useLiveVoice(options: UseLiveVoiceOptions) {
  const [liveStatus, setLiveStatus] = useState<LiveStatus>("idle");
  const [isModelSpeaking, setIsModelSpeaking] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);
  const isStreamingRef = useRef<boolean>(false);

  const currentUserTurnRef = useRef<string>("");
  const currentModelTurnRef = useRef<string>("");
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const clearPlaybackQueue = useCallback(() => {
    for (const src of activeSourcesRef.current) {
      try {
        src.stop();
        src.disconnect();
      } catch {
        // Ignore already stopped sources
      }
    }
    activeSourcesRef.current.clear();
    if (outputAudioCtxRef.current) {
      nextStartTimeRef.current = outputAudioCtxRef.current.currentTime;
    } else {
      nextStartTimeRef.current = 0;
    }
    setIsModelSpeaking(false);
  }, []);

  const stopLive = useCallback(() => {
    isStreamingRef.current = false;

    if (processorRef.current) {
      try {
        processorRef.current.onaudioprocess = null;
        processorRef.current.disconnect();
      } catch {
        // Ignore
      }
      processorRef.current = null;
    }

    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.disconnect();
      } catch {
        // Ignore
      }
      sourceNodeRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }

    clearPlaybackQueue();

    if (inputAudioCtxRef.current) {
      inputAudioCtxRef.current.close().catch(() => {});
      inputAudioCtxRef.current = null;
    }

    if (outputAudioCtxRef.current) {
      outputAudioCtxRef.current.close().catch(() => {});
      outputAudioCtxRef.current = null;
    }

    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {
        // Ignore
      }
      wsRef.current = null;
    }

    currentUserTurnRef.current = "";
    currentModelTurnRef.current = "";
    setLiveStatus("idle");
    setIsModelSpeaking(false);
  }, [clearPlaybackQueue]);

  const scheduleAudioChunk = useCallback((base64Audio: string) => {
    const ctx = outputAudioCtxRef.current;
    if (!ctx) return;

    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const float32 = base64ToFloat32Pcm(base64Audio);
    if (float32.length === 0) return;

    const buffer = ctx.createBuffer(1, float32.length, 24000);
    buffer.copyToChannel(float32, 0);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);

    const now = ctx.currentTime;
    if (nextStartTimeRef.current < now) {
      nextStartTimeRef.current = now + 0.02;
    }
    const startAt = nextStartTimeRef.current;
    nextStartTimeRef.current = startAt + buffer.duration;

    activeSourcesRef.current.add(source);
    setIsModelSpeaking(true);

    source.onended = () => {
      activeSourcesRef.current.delete(source);
      if (activeSourcesRef.current.size === 0) {
        setIsModelSpeaking(false);
      }
    };

    source.start(startAt);
  }, []);

  const startLive = useCallback(async () => {
    if (liveStatus === "connecting" || liveStatus === "active") return;
    setLiveError(null);
    setLiveStatus("connecting");
    currentUserTurnRef.current = "";
    currentModelTurnRef.current = "";

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const inputCtx = new AudioContext({ sampleRate: 16000 });
      const outputCtx = new AudioContext({ sampleRate: 24000 });
      inputAudioCtxRef.current = inputCtx;
      outputAudioCtxRef.current = outputCtx;
      nextStartTimeRef.current = outputCtx.currentTime;

      const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const ws = new WebSocket(`${wsProtocol}//${window.location.host}/live`);
      wsRef.current = ws;

      ws.onopen = () => {
        isStreamingRef.current = true;
        const source = inputCtx.createMediaStreamSource(stream);
        const processor = inputCtx.createScriptProcessor(4096, 1, 1);
        sourceNodeRef.current = source;
        processorRef.current = processor;

        processor.onaudioprocess = (e) => {
          if (!isStreamingRef.current || ws.readyState !== WebSocket.OPEN) return;
          const channelData = e.inputBuffer.getChannelData(0);
          const base64 = pcmFloat32ToBase64(channelData);
          ws.send(JSON.stringify({ audio: base64 }));
        };

        source.connect(processor);
        processor.connect(inputCtx.destination);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.ready) {
            setLiveStatus("active");
          }
          if (msg.error) {
            setLiveError(msg.error);
            setLiveStatus("error");
            optionsRef.current.onError?.(msg.error);
            stopLive();
            return;
          }
          if (msg.inputTranscript) {
            currentUserTurnRef.current += msg.inputTranscript;
            optionsRef.current.onUserTranscript?.(currentUserTurnRef.current);
          }
          if (msg.outputTranscript) {
            currentModelTurnRef.current += msg.outputTranscript;
            optionsRef.current.onModelTranscript?.(currentModelTurnRef.current);
          }
          if (msg.audio) {
            scheduleAudioChunk(msg.audio);
          }
          if (msg.interrupted) {
            clearPlaybackQueue();
          }
          if (msg.turnComplete) {
            const u = currentUserTurnRef.current.trim();
            const m = currentModelTurnRef.current.trim();
            if (u || m) {
              optionsRef.current.onTurnComplete?.(u, m);
            }
            currentUserTurnRef.current = "";
            currentModelTurnRef.current = "";
          }
        } catch (err) {
          console.error("Failed to parse Live API message:", err);
        }
      };

      ws.onerror = () => {
        const errMsg = "Voice connection failed. Verify microphone permissions and API key.";
        setLiveError(errMsg);
        optionsRef.current.onError?.(errMsg);
        stopLive();
      };

      ws.onclose = () => {
        if (isStreamingRef.current) {
          stopLive();
        }
      };
    } catch (error: any) {
      const errMsg = error?.message || "Microphone access is required for Live Voice.";
      setLiveError(errMsg);
      setLiveStatus("error");
      optionsRef.current.onError?.(errMsg);
      stopLive();
    }
  }, [clearPlaybackQueue, liveStatus, scheduleAudioChunk, stopLive]);

  useEffect(() => {
    return () => {
      stopLive();
    };
  }, [stopLive]);

  return {
    liveStatus,
    isLiveActive: liveStatus === "connecting" || liveStatus === "active",
    isModelSpeaking,
    liveError,
    startLive,
    stopLive,
  };
}
