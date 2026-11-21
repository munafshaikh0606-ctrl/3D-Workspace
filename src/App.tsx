/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { Sliders, X, Mic, MicOff, LogIn, LogOut, User as UserIcon } from "lucide-react";
import RobotCanvas from "./components/RobotCanvas";
import CustomizerPanel from "./components/CustomizerPanel";
import ChatInterface, { SavedConversation } from "./components/ChatInterface";
import { Message, CustomizerState, DEFAULT_CUSTOMIZER_STATE } from "./types";
import { useAuth } from "./contexts/AuthContext";
import { useLiveVoice } from "./hooks/useLiveVoice";

function cleanTextForSpeech(raw: string): string {
  return raw
    .replace(/[*_`~#>-]/g, " ")
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export default function App() {
  const { user, signInWithGoogle, signOut, getIdToken } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<SavedConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [customizer, setCustomizer] = useState<CustomizerState>(DEFAULT_CUSTOMIZER_STATE);
  const [currentGesture, setCurrentGesture] = useState<string>("wave");
  const [isPersonalizerOpen, setIsPersonalizerOpen] = useState(false);
  const [liveDraftUser, setLiveDraftUser] = useState<string>("");
  const [liveDraftModel, setLiveDraftModel] = useState<string>("");

  const abortControllerRef = useRef<AbortController | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const speechPollRef = useRef<number | null>(null);
  const customizerLoadedRef = useRef(false);
  const activeConversationIdRef = useRef<number | null>(null);
  activeConversationIdRef.current = activeConversationId;

  // Mobile View Tabs: "viewport" (G-3D Canvas) or "chat" (Messaging Dashboard)
  const [mobileTab, setMobileTab] = useState<"viewport" | "chat">("chat");

  const clearSpeechPoll = useCallback(() => {
    if (speechPollRef.current !== null) {
      window.clearInterval(speechPollRef.current);
      speechPollRef.current = null;
    }
  }, []);

  const stopSpeech = useCallback(() => {
    clearSpeechPoll();
    utteranceRef.current = null;
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore browser speechSynthesis errors
      }
    }
    setIsSpeaking(false);
    setSpeakingMessageId(null);
  }, [clearSpeechPoll]);

  const speakMessage = useCallback(
    (text: string, messageId?: string) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        return;
      }

      const cleaned = cleanTextForSpeech(text);
      if (!cleaned) return;

      clearSpeechPoll();
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore
      }

      const utterance = new SpeechSynthesisUtterance(cleaned);
      utterance.rate = 1.02;
      utterance.pitch = 1.0;

      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        const preferred =
          voices.find((v) => v.lang.startsWith("en") && /google|natural|daniel|alex|david/i.test(v.name)) ||
          voices.find((v) => v.lang.startsWith("en")) ||
          voices[0];
        if (preferred) utterance.voice = preferred;
      }

      utteranceRef.current = utterance;
      setIsSpeaking(true);
      setSpeakingMessageId(messageId || null);

      const finishSpeech = () => {
        if (utteranceRef.current === utterance) {
          utteranceRef.current = null;
          clearSpeechPoll();
          setIsSpeaking(false);
          setSpeakingMessageId(null);
        }
      };

      utterance.onend = finishSpeech;
      utterance.onerror = finishSpeech;

      try {
        window.speechSynthesis.speak(utterance);
        const startedAt = Date.now();
        speechPollRef.current = window.setInterval(() => {
          if (utteranceRef.current !== utterance) {
            clearSpeechPoll();
            return;
          }
          const synth = window.speechSynthesis;
          if (!synth.speaking && !synth.pending && Date.now() - startedAt > 400) {
            finishSpeech();
          }
        }, 300);
      } catch {
        finishSpeech();
      }
    },
    [clearSpeechPoll]
  );

  // Authenticated persistence helpers (silent on guest mode)
  const ensureConversationId = useCallback(
    async (seedTitle: string, mode: "chat" | "live" = "chat"): Promise<number | null> => {
      if (!user) return null;
      if (activeConversationIdRef.current) return activeConversationIdRef.current;

      const token = await getIdToken();
      if (!token) return null;

      try {
        const res = await fetch("/api/conversations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: seedTitle.slice(0, 60) || "Jade Palace Session",
            mode,
          }),
        });
        if (!res.ok) return null;
        const created = await res.json();
        setActiveConversationId(created.id);
        activeConversationIdRef.current = created.id;
        setConversations((prev) => [created, ...prev]);
        return created.id;
      } catch {
        return null;
      }
    },
    [user, getIdToken]
  );

  const persistMessage = useCallback(
    async (
      convId: number | null,
      role: "user" | "model",
      text: string,
      gesture?: string,
      source: "text" | "live" = "text"
    ) => {
      if (!user || !convId || !text.trim()) return;
      const token = await getIdToken();
      if (!token) return;

      try {
        await fetch(`/api/conversations/${convId}/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ role, text, gesture, source }),
        });
      } catch {
        // Non-blocking persistence failure
      }
    },
    [user, getIdToken]
  );

  // Gemini Live Voice Conversations (gemini-3.8-live)
  const {
    liveStatus,
    isLiveActive,
    isModelSpeaking: isLiveModelSpeaking,
    liveError,
    startLive,
    stopLive,
  } = useLiveVoice({
    onUserTranscript: (text) => {
      setLiveDraftUser(text);
    },
    onModelTranscript: (text) => {
      setLiveDraftModel(text);
      setCurrentGesture("happy");
    },
    onTurnComplete: async (userText, modelText) => {
      setLiveDraftUser("");
      setLiveDraftModel("");
      const timeLabel = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const newMsgs: Message[] = [];
      if (userText) {
        newMsgs.push({
          id: crypto.randomUUID(),
          role: "user",
          text: userText,
          timestamp: timeLabel,
        });
      }
      if (modelText) {
        newMsgs.push({
          id: crypto.randomUUID(),
          role: "model",
          text: modelText,
          gesture: "happy",
          timestamp: timeLabel,
        });
      }
      if (newMsgs.length > 0) {
        setMessages((prev) => [...prev, ...newMsgs]);
        const convId = await ensureConversationId(userText || "Live Voice Session", "live");
        for (const m of newMsgs) {
          await persistMessage(convId, m.role, m.text, m.gesture, "live");
        }
      }
    },
    onError: (errMsg) => {
      const errReply: Message = {
        id: crypto.randomUUID(),
        role: "model",
        text: errMsg,
        gesture: "surprise",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errReply]);
      setCurrentGesture("surprise");
    },
  });

  const handleStopChat = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    stopSpeech();
    if (isLiveActive) {
      stopLive();
      setLiveDraftUser("");
      setLiveDraftModel("");
    }
    setIsLoading(false);
    setCurrentGesture("idle");
  }, [stopSpeech, isLiveActive, stopLive]);

  const handleToggleLiveVoice = useCallback(() => {
    if (isLiveActive) {
      stopLive();
      setLiveDraftUser("");
      setLiveDraftModel("");
      setCurrentGesture("idle");
    } else {
      stopSpeech();
      setCurrentGesture("wave");
      startLive();
    }
  }, [isLiveActive, stopLive, stopSpeech, startLive]);

  // Load saved conversations and customizer config when signed in
  useEffect(() => {
    let cancelled = false;

    async function loadUserData() {
      if (!user) {
        customizerLoadedRef.current = false;
        setConversations([]);
        setActiveConversationId(null);
        return;
      }

      const token = await getIdToken();
      if (!token || cancelled) return;

      try {
        const [convRes, custRes] = await Promise.all([
          fetch("/api/conversations", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("/api/customizer", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (custRes.ok && !cancelled) {
          const custData = await custRes.json();
          if (custData?.config) {
            setCustomizer({ ...DEFAULT_CUSTOMIZER_STATE, ...custData.config });
          }
          customizerLoadedRef.current = true;
        }

        if (convRes.ok && !cancelled) {
          const convList: SavedConversation[] = await convRes.json();
          setConversations(convList);
          if (convList.length > 0 && !activeConversationIdRef.current) {
            const firstId = convList[0].id;
            setActiveConversationId(firstId);
            const msgRes = await fetch(`/api/conversations/${firstId}/messages`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (msgRes.ok && !cancelled) {
              const payload = await msgRes.json();
              const loaded: Message[] = (payload.messages || []).map((row: any) => ({
                id: String(row.id),
                role: row.role === "user" ? "user" : "model",
                text: row.text,
                gesture: row.gesture || undefined,
                timestamp: row.createdAt
                  ? new Date(row.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                  : "",
              }));
              setMessages(loaded);
            }
          }
        }
      } catch (err) {
        console.error("Failed loading saved workspace data:", err);
      }
    }

    loadUserData();
    return () => {
      cancelled = true;
    };
  }, [user, getIdToken]);

  // Debounce-save customizer changes when signed in
  useEffect(() => {
    if (!user || !customizerLoadedRef.current) return;
    const timer = window.setTimeout(async () => {
      const token = await getIdToken();
      if (!token) return;
      try {
        await fetch("/api/customizer", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ config: customizer }),
        });
      } catch {
        // Ignore background save error
      }
    }, 700);
    return () => window.clearTimeout(timer);
  }, [customizer, user, getIdToken]);

  const handleSelectConversation = useCallback(
    async (convId: number) => {
      if (!user) return;
      handleStopChat();
      const token = await getIdToken();
      if (!token) return;
      setActiveConversationId(convId);
      try {
        const res = await fetch(`/api/conversations/${convId}/messages`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const payload = await res.json();
          const loaded: Message[] = (payload.messages || []).map((row: any) => ({
            id: String(row.id),
            role: row.role === "user" ? "user" : "model",
            text: row.text,
            gesture: row.gesture || undefined,
            timestamp: row.createdAt
              ? new Date(row.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : "",
          }));
          setMessages(loaded);
        }
      } catch (err) {
        console.error("Error switching conversation:", err);
      }
    },
    [user, getIdToken, handleStopChat]
  );

  const handleNewConversation = useCallback(() => {
    handleStopChat();
    setActiveConversationId(null);
    activeConversationIdRef.current = null;
    setMessages([]);
  }, [handleStopChat]);

  const handleDeleteConversation = useCallback(
    async (convId: number) => {
      if (!user) return;
      const token = await getIdToken();
      if (!token) return;
      try {
        const res = await fetch(`/api/conversations/${convId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          setConversations((prev) => prev.filter((c) => c.id !== convId));
          if (activeConversationIdRef.current === convId) {
            setActiveConversationId(null);
            activeConversationIdRef.current = null;
            setMessages([]);
          }
        }
      } catch (err) {
        console.error("Failed to delete conversation:", err);
      }
    },
    [user, getIdToken]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      stopSpeech();
    };
  }, [stopSpeech]);

  // Reset active gesture to "idle" after animation finishes
  useEffect(() => {
    if (currentGesture === "idle") return;

    const gestureDurations: Record<string, number> = {
      wave: 3500,
      happy: 4000,
      thinking: 8000,
      nod: 3000,
      surprise: 3000,
      dance: 12000,
    };

    const duration = gestureDurations[currentGesture] || 4000;
    const timer = setTimeout(() => {
      setCurrentGesture("idle");
    }, duration);

    return () => clearTimeout(timer);
  }, [currentGesture]);

  const handleSendMessage = async (text: string) => {
    if (isLoading) return;

    stopSpeech();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    setCurrentGesture("thinking");

    const historyPayload = messages.slice(-12).map((msg) => ({
      role: msg.role,
      text: msg.text,
    }));

    let convIdPromise: Promise<number | null> | null = null;
    if (user) {
      convIdPromise = ensureConversationId(text, "chat").then(async (id) => {
        await persistMessage(id, "user", text, undefined, "text");
        return id;
      });
    }

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          message: text,
          history: historyPayload,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Failed to reach Gemini API.");
      }

      if (controller.signal.aborted) return;

      const companionMsg: Message = {
        id: crypto.randomUUID(),
        role: "model",
        text: data.text,
        gesture: data.gesture,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, companionMsg]);
      setCurrentGesture(data.gesture || "idle");

      if (ttsEnabled) {
        speakMessage(companionMsg.text, companionMsg.id);
      }

      if (convIdPromise) {
        const cid = await convIdPromise;
        await persistMessage(cid, "model", companionMsg.text, companionMsg.gesture, "text");
      }
    } catch (error: any) {
      if (error?.name === "AbortError") {
        return;
      }
      console.error("Transmission failure:", error);

      const errorMsg: Message = {
        id: crypto.randomUUID(),
        role: "model",
        text: error?.message || "Unable to reach the Jade Palace API. Please try again.",
        gesture: "surprise",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, errorMsg]);
      setCurrentGesture("surprise");

      if (ttsEnabled) {
        speakMessage(errorMsg.text, errorMsg.id);
      }
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      setIsLoading(false);
    }
  };

  const handleResetCustomizer = () => {
    setCustomizer(DEFAULT_CUSTOMIZER_STATE);
  };

  const isVideoActive = isLoading || isSpeaking || isLiveActive;

  return (
    <div className="flex flex-col h-screen w-screen bg-[#f2efeb] font-sans text-[#1a1a1a] p-4 sm:p-5 overflow-hidden antialiased gap-4 sm:gap-5">
      {/* 1. Header Bar with Neo-Brutalist styling */}
      <header className="h-20 shrink-0 bg-white border-[3px] border-[#1a1a1a] shadow-[6px_6px_0_#1a1a1a] px-5 flex items-center justify-between gap-3 relative z-30 select-none">
        <div className="brand flex flex-col min-w-0">
          <h1 className="font-gothic text-xl sm:text-3xl font-black text-[#1a1a1a] leading-none uppercase tracking-tight truncate">
            KUNG_FU_PANDA_3D
          </h1>
          <div className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-[#1a1a1a] mt-1">
            JADE PALACE // {isLiveActive ? "LIVE VOICE ACTIVE" : "CHI ONLINE"}
          </div>
        </div>

        {/* Current Active Gesture Tag */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-[#ff4d00] text-white border-2 border-[#1a1a1a] text-[10px] font-mono font-bold uppercase tracking-widest shadow-[3px_3px_0_#1a1a1a]">
          <span>STANCE:</span>
          <span className="font-black">{currentGesture.toUpperCase()}</span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Live Voice Conversation Button (gemini-3.8-live) */}
          <button
            type="button"
            onClick={handleToggleLiveVoice}
            className={`font-mono text-[10px] sm:text-xs font-bold uppercase tracking-[0.1em] px-3 sm:px-4 py-2 border-2 border-[#1a1a1a] transition-all duration-100 cursor-pointer flex items-center gap-1.5 ${
              isLiveActive
                ? "bg-[#ff4d00] text-white shadow-none translate-x-[2px] translate-y-[2px]"
                : "bg-white text-[#1a1a1a] hover:bg-[#f2efeb] hover:translate-y-[-2px] hover:-translate-x-[2px] hover:shadow-[4px_4px_0_#1a1a1a] shadow-[2px_2px_0_#1a1a1a]"
            }`}
          >
            {isLiveActive ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-[#ff4d00]" />}
            <span className="hidden sm:inline">
              {liveStatus === "connecting" ? "Connecting..." : isLiveActive ? "End Voice" : "Live Voice"}
            </span>
          </button>

          {/* Google Sign-In / Account Button */}
          {user ? (
            <button
              type="button"
              onClick={signOut}
              title={`Signed in as ${user.email || "User"} (Click to sign out)`}
              className="font-mono text-[10px] sm:text-xs font-bold uppercase tracking-[0.08em] px-3 py-2 border-2 border-[#1a1a1a] bg-[#f2efeb] text-[#1a1a1a] hover:bg-white hover:translate-y-[-2px] hover:-translate-x-[2px] hover:shadow-[4px_4px_0_#1a1a1a] shadow-[2px_2px_0_#1a1a1a] transition-all cursor-pointer flex items-center gap-1.5"
            >
              <UserIcon className="w-3.5 h-3.5 text-[#ff4d00]" />
              <span className="hidden xl:inline max-w-[120px] truncate">{user.displayName || user.email}</span>
              <LogOut className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={signInWithGoogle}
              className="font-mono text-[10px] sm:text-xs font-bold uppercase tracking-[0.08em] px-3 py-2 border-2 border-[#1a1a1a] bg-white text-[#1a1a1a] hover:bg-[#f2efeb] hover:translate-y-[-2px] hover:-translate-x-[2px] hover:shadow-[4px_4px_0_#1a1a1a] shadow-[2px_2px_0_#1a1a1a] transition-all cursor-pointer flex items-center gap-1.5"
            >
              <LogIn className="w-3.5 h-3.5 text-[#ff4d00]" />
              <span className="hidden sm:inline">Sign In</span>
            </button>
          )}

          {/* Personalizer Toggle Button */}
          <button
            type="button"
            onClick={() => setIsPersonalizerOpen(!isPersonalizerOpen)}
            className={`font-mono text-[10px] sm:text-xs font-bold uppercase tracking-[0.1em] px-3 sm:px-4 py-2 border-2 border-[#1a1a1a] transition-all duration-100 cursor-pointer ${
              isPersonalizerOpen
                ? "bg-[#1a1a1a] text-white shadow-none translate-x-[2px] translate-y-[2px]"
                : "bg-white text-[#1a1a1a] hover:bg-[#f2efeb] hover:translate-y-[-2px] hover:-translate-x-[2px] hover:shadow-[4px_4px_0_#1a1a1a] active:translate-y-0 active:translate-x-0 active:shadow-none shadow-[2px_2px_0_#1a1a1a]"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Personalizer</span>
            </span>
          </button>
        </div>
      </header>

      {/* Mobile Selector Tabs (renders on screens < md) */}
      <div className="flex md:hidden h-14 bg-white border-[3px] border-[#1a1a1a] shadow-[4px_4px_0_#1a1a1a] items-center justify-around px-2 shrink-0 select-none">
        <button
          onClick={() => setMobileTab("chat")}
          className={`font-mono text-xs font-bold py-2 w-[45%] text-center border-2 border-[#1a1a1a] transition-all cursor-pointer ${
            mobileTab === "chat"
              ? "bg-[#ff4d00] text-white shadow-none translate-y-[1px]"
              : "bg-white text-[#1a1a1a] shadow-[2px_2px_0_#1a1a1a]"
          }`}
        >
          💬 MESSAGING
        </button>

        <button
          onClick={() => setMobileTab("viewport")}
          className={`font-mono text-xs font-bold py-2 w-[45%] text-center border-2 border-[#1a1a1a] transition-all cursor-pointer ${
            mobileTab === "viewport"
              ? "bg-[#ff4d00] text-white shadow-none translate-y-[1px]"
              : "bg-white text-[#1a1a1a] shadow-[2px_2px_0_#1a1a1a]"
          }`}
        >
          🐼 3D VIEWPORT
        </button>
      </div>

      {/* 2. Main Space Grid */}
      <div className="flex-1 flex overflow-hidden relative gap-4 sm:gap-5">
        {/* Left Side: 3D Robot Viewport */}
        <div
          className={`flex-1 h-full relative border-[3px] border-[#1a1a1a] shadow-[10px_10px_0_#1a1a1a] bg-white overflow-hidden rounded-none ${
            mobileTab === "viewport" ? "block" : "hidden md:block"
          }`}
        >
          {/* Core 3D Canvas */}
          <RobotCanvas
            customizer={customizer}
            gesture={currentGesture}
            isVideoActive={isVideoActive}
            onStop={handleStopChat}
          />

          {/* Floated Status Tag */}
          <div className="absolute top-5 left-5 p-4 bg-[#1a1a1a] text-white border-2 border-white max-w-[240px] pointer-events-none select-none shadow-[4px_4px_0_#1a1a1a] z-10">
            <div className="text-[9px] font-mono uppercase tracking-[0.15em] text-white/60">CHI ENERGY LEVEL</div>
            <h3 className="text-base font-black tracking-tight uppercase italic mt-1 font-sans">
              DRAGON WARRIOR // PO
            </h3>
            <div className="h-0.5 w-full bg-white/20 my-2"></div>
            <p className="text-[10px] font-mono leading-relaxed space-y-0.5">
              Finish: <span className="text-white font-black">{customizer.robotMaterialPreset.toUpperCase()}</span>
              <br />
              Scene: <span className="text-white font-black">{customizer.environmentPreset.toUpperCase()}</span>
              <br />
              Voice: <span className="text-[#ff4d00] font-black">{isLiveActive ? "LIVE_3.8" : "DUMPLING_v2"}</span>
            </p>
          </div>

          {/* Drag to rotate label */}
          <div className="absolute bottom-5 right-5 font-mono text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.1em] bg-white text-[#1a1a1a] px-3 py-1.5 border-2 border-[#1a1a1a] shadow-[4px_4px_0_#1a1a1a] z-10 select-none">
            DRAG TO ROTATE MODEL
          </div>
        </div>

        {/* Right Side: Messaging & Live Voice Interface */}
        <div
          className={`w-full md:w-[460px] lg:w-[480px] xl:w-[520px] h-full shrink-0 transition-all duration-300 ${
            mobileTab === "chat" ? "block" : "hidden md:block"
          }`}
        >
          <ChatInterface
            messages={messages}
            onSendMessage={handleSendMessage}
            onStopChat={handleStopChat}
            isLoading={isLoading}
            isSpeaking={isSpeaking || isLiveModelSpeaking}
            speakingMessageId={speakingMessageId}
            ttsEnabled={ttsEnabled}
            onToggleTts={() => {
              if (ttsEnabled) {
                stopSpeech();
              }
              setTtsEnabled((prev) => !prev);
            }}
            onSpeakMessage={(text, id) => speakMessage(text, id)}
            onStopSpeech={stopSpeech}
            customizer={customizer}
            currentGesture={currentGesture}
            onSetGesture={(g) => setCurrentGesture(g)}
            isLiveActive={isLiveActive}
            liveStatus={liveStatus}
            liveError={liveError}
            liveDraftUser={liveDraftUser}
            liveDraftModel={liveDraftModel}
            onToggleLiveVoice={handleToggleLiveVoice}
            isSignedIn={Boolean(user)}
            conversations={conversations}
            activeConversationId={activeConversationId}
            onSelectConversation={handleSelectConversation}
            onNewConversation={handleNewConversation}
            onDeleteConversation={handleDeleteConversation}
          />
        </div>

        {/* Slide-out Customizer Drawer */}
        {isPersonalizerOpen && (
          <div className="absolute right-0 top-0 bottom-0 z-40 w-full sm:w-[360px] md:w-[400px] h-full">
            <button
              onClick={() => setIsPersonalizerOpen(false)}
              className="absolute left-[-42px] top-4 bg-white border-[3px] border-[#1a1a1a] border-r-0 hover:bg-[#f2efeb] p-2 text-[#1a1a1a] z-50 focus:outline-none transition-colors cursor-pointer shadow-[-4px_4px_0_#1a1a1a]"
            >
              <X className="w-5 h-5 stroke-[2.5]" />
            </button>
            <div className="h-full border-[3px] border-[#1a1a1a] shadow-[10px_10px_0_#1a1a1a] bg-white overflow-hidden">
              <CustomizerPanel
                customizer={customizer}
                onChange={setCustomizer}
                onReset={handleResetCustomizer}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
