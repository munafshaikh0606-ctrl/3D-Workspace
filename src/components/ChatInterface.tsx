/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { ArrowRight, Terminal, Volume2, VolumeX, Square, Mic, MicOff, Plus, Trash2 } from "lucide-react";
import { Message, CustomizerState } from "../types";
import { LiveStatus } from "../hooks/useLiveVoice";

export interface SavedConversation {
  id: number;
  title: string;
  mode: string;
  updatedAt?: string;
}

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (text: string) => void;
  onStopChat: () => void;
  isLoading: boolean;
  isSpeaking: boolean;
  speakingMessageId: string | null;
  ttsEnabled: boolean;
  onToggleTts: () => void;
  onSpeakMessage: (text: string, id: string) => void;
  onStopSpeech: () => void;
  customizer: CustomizerState;
  currentGesture: string;
  onSetGesture: (gesture: string) => void;
  isLiveActive: boolean;
  liveStatus: LiveStatus;
  liveError: string | null;
  liveDraftUser: string;
  liveDraftModel: string;
  onToggleLiveVoice: () => void;
  isSignedIn: boolean;
  conversations: SavedConversation[];
  activeConversationId: number | null;
  onSelectConversation: (id: number) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: number) => void;
}

function InteractiveChatBubble({
  message,
  isSpeakingThis,
  onSpeak,
  onStopSpeech,
}: {
  message: Message;
  customizer: CustomizerState;
  isSpeakingThis: boolean;
  onSpeak: () => void;
  onStopSpeech: () => void;
}) {
  const isUser = message.role === "user";

  return (
    <div
      style={{
        transition: "transform 0.1s ease-out, box-shadow 0.1s ease-out",
      }}
      className={`relative max-w-[85%] p-4 border-2 border-[#1a1a1a] select-text flex gap-3 ${
        isUser
          ? "ml-auto bg-[#ff4d00] text-white shadow-[4px_4px_0_#1a1a1a]"
          : "mr-auto bg-white text-[#1a1a1a] shadow-[-4px_4px_0_#1a1a1a]"
      }`}
    >
      {/* Role Avatar Badge */}
      {isUser ? (
        <div className="w-8 h-8 bg-white border-2 border-[#1a1a1a] text-[#1a1a1a] flex-shrink-0 flex items-center justify-center font-bold text-xs shadow-[2px_2px_0_#1a1a1a] select-none">
          C
        </div>
      ) : (
        <div className="w-8 h-8 bg-[#ff4d00] border-2 border-[#1a1a1a] text-white flex-shrink-0 flex items-center justify-center text-sm shadow-[2px_2px_0_#1a1a1a] select-none">
          🐼
        </div>
      )}

      {/* Message Content */}
      <div className="flex flex-col gap-1 min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={`text-[9px] font-mono font-bold uppercase tracking-[0.15em] ${
              isUser ? "text-white/80" : "text-[#1a1a1a]/60"
            }`}
          >
            {isUser ? "CREATOR" : "DRAGON WARRIOR // PO"}
          </span>
          {!isUser && message.gesture && (
            <span className="text-[8px] font-mono font-bold tracking-wider px-1.5 py-0.5 border border-[#1a1a1a] bg-[#f2efeb] text-[#1a1a1a]">
              {message.gesture.toUpperCase()}
            </span>
          )}
          {!isUser && (
            <button
              type="button"
              onClick={isSpeakingThis ? onStopSpeech : onSpeak}
              title={isSpeakingThis ? "Stop Speech" : "Speak Response"}
              className={`ml-auto px-1.5 py-0.5 border border-[#1a1a1a] flex items-center gap-1 text-[8px] font-mono font-bold uppercase cursor-pointer transition-colors ${
                isSpeakingThis
                  ? "bg-[#ff4d00] text-white"
                  : "bg-[#f2efeb] text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-white"
              }`}
            >
              {isSpeakingThis ? (
                <>
                  <Square className="w-2.5 h-2.5 fill-current" />
                  <span>STOP</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-2.5 h-2.5" />
                  <span>TTS</span>
                </>
              )}
            </button>
          )}
          <span
            className={`text-[8px] font-mono ${isUser ? "ml-auto text-white/50" : "text-[#1a1a1a]/40"}`}
          >
            {message.timestamp}
          </span>
        </div>
        <div className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap select-text markdown-body font-sans">
          {message.text}
        </div>
      </div>
    </div>
  );
}

function PromptSuggestionButton({ text, onClick }: { text: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left p-3 border-2 border-[#1a1a1a] bg-white text-[#1a1a1a] hover:bg-[#ff4d00] hover:text-white hover:translate-y-[-2px] hover:-translate-x-[2px] hover:shadow-[4px_4px_0_#1a1a1a] active:translate-y-0 active:translate-x-0 active:shadow-none shadow-[2px_2px_0_#1a1a1a] transition-all duration-75 font-mono text-[10px] sm:text-xs font-bold uppercase tracking-wide cursor-pointer"
    >
      <span className="flex items-center justify-between gap-2">
        <span className="line-clamp-2">{text}</span>
        <ArrowRight className="w-3.5 h-3.5 shrink-0" />
      </span>
    </button>
  );
}

export default function ChatInterface({
  messages,
  onSendMessage,
  onStopChat,
  isLoading,
  isSpeaking,
  speakingMessageId,
  ttsEnabled,
  onToggleTts,
  onSpeakMessage,
  onStopSpeech,
  customizer,
  currentGesture,
  onSetGesture,
  isLiveActive,
  liveStatus,
  liveError,
  liveDraftUser,
  liveDraftModel,
  onToggleLiveVoice,
  isSignedIn,
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
}: ChatInterfaceProps) {
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, liveDraftUser, liveDraftModel]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const suggestions = [
    "Do a high-kick kungfu dance and tell me about dumplings!",
    "Switch material to Holographic Jade and show me your inner Chi.",
    "Bow respectfully and explain the secret ingredient of the Dragon Scroll.",
    "Give me advice on becoming a true martial arts master.",
  ];

  const approvedGestures = ["idle", "wave", "happy", "thinking", "nod", "surprise", "dance"];

  return (
    <div className="flex flex-col h-full bg-white border-[3px] border-[#1a1a1a] shadow-[8px_8px_0_#1a1a1a] text-[#1a1a1a] overflow-hidden">
      {/* Terminal Stream Header */}
      <div className="font-mono text-xs font-bold uppercase tracking-[0.15em] px-5 py-4 border-b-[3px] border-[#1a1a1a] bg-[#f2efeb] text-[#1a1a1a] shrink-0 flex items-center justify-between gap-2">
        <span className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-[#ff4d00]" />
          <span>Terminal Stream</span>
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onToggleLiveVoice}
            className={`text-[9px] px-2 py-0.5 font-bold uppercase border border-[#1a1a1a] flex items-center gap-1 cursor-pointer transition-colors ${
              isLiveActive ? "bg-[#ff4d00] text-white" : "bg-white text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-white"
            }`}
            title={isLiveActive ? "Stop Live Voice Conversation" : "Start Gemini Live Voice Conversation"}
          >
            {isLiveActive ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
            <span>{liveStatus === "connecting" ? "CONNECTING" : isLiveActive ? "END VOICE" : "VOICE"}</span>
          </button>

          <button
            type="button"
            onClick={onToggleTts}
            className={`text-[9px] px-2 py-0.5 font-bold uppercase border border-[#1a1a1a] flex items-center gap-1 cursor-pointer transition-colors ${
              ttsEnabled ? "bg-[#ff4d00] text-white" : "bg-white text-[#1a1a1a]"
            }`}
            title={ttsEnabled ? "Disable Auto Text-to-Speech" : "Enable Auto Text-to-Speech"}
          >
            {ttsEnabled ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
            <span>{ttsEnabled ? "TTS ON" : "TTS OFF"}</span>
          </button>

          <span className="text-[9px] bg-[#1a1a1a] text-white px-2 py-0.5 font-bold uppercase">
            {isLoading || isSpeaking || isLiveActive ? "ACTIVE" : "LIVE"}
          </span>
        </div>
      </div>

      {/* Saved Conversations Bar (shown when signed in) */}
      {isSignedIn && (
        <div className="px-4 py-2 bg-white border-b-2 border-[#1a1a1a] flex items-center gap-2 overflow-x-auto scrollbar-none shrink-0">
          <button
            type="button"
            onClick={onNewConversation}
            className="text-[9px] font-mono font-bold uppercase px-2 py-1 border border-[#1a1a1a] bg-[#ff4d00] text-white shrink-0 flex items-center gap-1 cursor-pointer shadow-[2px_2px_0_#1a1a1a] active:shadow-none"
          >
            <Plus className="w-3 h-3" />
            <span>New</span>
          </button>
          {conversations.map((conv) => (
            <div
              key={conv.id}
              className={`flex items-center border border-[#1a1a1a] shrink-0 text-[9px] font-mono font-bold ${
                activeConversationId === conv.id
                  ? "bg-[#1a1a1a] text-white"
                  : "bg-[#f2efeb] text-[#1a1a1a] hover:bg-white"
              }`}
            >
              <button
                type="button"
                onClick={() => onSelectConversation(conv.id)}
                className="px-2 py-1 max-w-[140px] truncate cursor-pointer text-left"
                title={conv.title}
              >
                {conv.title}
              </button>
              <button
                type="button"
                onClick={() => onDeleteConversation(conv.id)}
                className="px-1.5 py-1 border-l border-[#1a1a1a]/30 hover:text-[#ff4d00] cursor-pointer"
                title="Delete session"
              >
                <Trash2 className="w-2.5 h-2.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar bg-white">
        {messages.length === 0 && !liveDraftUser && !liveDraftModel ? (
          <div className="h-full flex flex-col items-center justify-center max-w-md mx-auto text-center p-4">
            {/* Panda Head */}
            <div className="relative w-28 h-28 mb-6 select-none shrink-0">
              <div className="absolute -top-1 -left-1 w-8 h-8 bg-[#1a1a1a] border-2 border-[#1a1a1a] rounded-full"></div>
              <div className="absolute -top-1 -right-1 w-8 h-8 bg-[#1a1a1a] border-2 border-[#1a1a1a] rounded-full"></div>
              <div className="relative w-full h-full bg-[#f8fafc] rounded-full border-3 border-[#1a1a1a] shadow-[4px_4px_0_#1a1a1a] flex flex-col items-center justify-center overflow-hidden">
                <div className="flex space-x-4 mb-2 mt-2">
                  <div className="relative w-6 h-8 bg-[#1a1a1a] rounded-full transform rotate-12 flex items-center justify-center">
                    <div className="w-2 h-2 bg-[#ff4d00] rounded-full"></div>
                  </div>
                  <div className="relative w-6 h-8 bg-[#1a1a1a] rounded-full transform -rotate-12 flex items-center justify-center">
                    <div className="w-2 h-2 bg-[#ff4d00] rounded-full"></div>
                  </div>
                </div>
                <div className="relative w-10 h-5 bg-[#f8fafc] rounded-full border border-black/10 -mt-1 flex flex-col items-center">
                  <div className="w-3.5 h-2 bg-black rounded-full"></div>
                </div>
              </div>
            </div>

            <h1 className="text-2xl font-gothic font-black uppercase mb-1 tracking-tight text-[#1a1a1a]">
              DRAGON WARRIOR // PO
            </h1>
            <p className="text-[10px] font-mono font-bold text-[#ff4d00] uppercase tracking-widest mb-4">
              JADE PALACE // Model-P3 RENDER ENGINE
            </p>
            <p className="text-xs text-[#1a1a1a]/60 leading-relaxed mb-6 font-medium">
              Chat with Po via text, launch a real-time Live Voice conversation, or customize my 3D materials and arena in the Personalizer.
            </p>

            <div className="w-full space-y-3">
              <div className="text-[9px] font-mono font-bold uppercase tracking-[0.2em] text-[#1a1a1a]/40 text-left pl-1">
                Suggested Directives // Command set
              </div>
              <div className="grid grid-cols-1 gap-2.5 w-full">
                {suggestions.map((text, i) => (
                  <PromptSuggestionButton key={i} text={text} onClick={() => onSendMessage(text)} />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-5 pb-4">
            {messages.map((msg) => (
              <InteractiveChatBubble
                key={msg.id}
                message={msg}
                customizer={customizer}
                isSpeakingThis={isSpeaking && speakingMessageId === msg.id}
                onSpeak={() => onSpeakMessage(msg.text, msg.id)}
                onStopSpeech={onStopSpeech}
              />
            ))}

            {liveDraftUser && (
              <div className="ml-auto max-w-[85%] p-3 border-2 border-dashed border-[#1a1a1a] bg-[#ff4d00]/90 text-white text-xs font-sans">
                <div className="text-[8px] font-mono font-bold uppercase tracking-widest text-white/80 mb-1">
                  LIVE MIC TRANSCRIPT
                </div>
                {liveDraftUser}
              </div>
            )}

            {liveDraftModel && (
              <div className="mr-auto max-w-[85%] p-3 border-2 border-dashed border-[#1a1a1a] bg-[#f2efeb] text-[#1a1a1a] text-xs font-sans">
                <div className="text-[8px] font-mono font-bold uppercase tracking-widest text-[#ff4d00] mb-1">
                  PO // LIVE AUDIO RESPONSE
                </div>
                {liveDraftModel}
              </div>
            )}

            {isLoading && (
              <div className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-wider text-[#ff4d00] bg-[#f2efeb] border-2 border-[#1a1a1a] px-3.5 py-2 w-max shadow-[3px_3px_0_#1a1a1a]">
                <span className="w-2 h-2 bg-[#ff4d00] inline-block"></span>
                <span>Po is channeling inner Chi...</span>
              </div>
            )}

            {liveError && (
              <div className="text-[10px] font-mono font-bold text-[#ff4d00] bg-[#f2efeb] border-2 border-[#1a1a1a] px-3 py-2">
                {liveError}
              </div>
            )}
            <div ref={endRef} />
          </div>
        )}
      </div>

      {/* Manual Gesture Overrides + Live Voice Controls */}
      <div className="px-5 py-3.5 bg-[#f2efeb] border-t-[3px] border-[#1a1a1a] select-none shrink-0">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-mono font-bold uppercase tracking-[0.15em] text-[#1a1a1a]/50">
              Manual Override // Kung Fu Stances
            </span>
            {isLiveActive && (
              <span className="text-[9px] font-mono font-bold uppercase tracking-[0.1em] text-[#ff4d00]">
                {liveStatus === "connecting" ? "CONNECTING MIC..." : "LIVE 3.8 STREAMING"}
              </span>
            )}
          </div>
          <div className="flex gap-1.5 overflow-x-auto py-1 shrink-0 scrollbar-none flex-wrap">
            {approvedGestures.map((g) => (
              <button
                key={g}
                onClick={() => onSetGesture(g)}
                className={`font-mono text-[9px] font-bold uppercase tracking-[0.1em] px-2.5 py-1.5 border-2 border-[#1a1a1a] transition-all cursor-pointer ${
                  currentGesture === g
                    ? "bg-[#1a1a1a] text-white shadow-none translate-y-[1px]"
                    : "bg-white text-[#1a1a1a] hover:bg-slate-50 hover:translate-y-[-1px] hover:shadow-[2px_2px_0_#1a1a1a] shadow-[1px_1px_0_#1a1a1a]"
                }`}
              >
                {g.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Message Input Form */}
      <div className="p-4 border-t-[3px] border-[#1a1a1a] bg-[#3d3d40] shrink-0">
        <form onSubmit={handleSubmit} className="flex gap-3.5 items-center">
          <div
            className="font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-white/70 shrink-0 select-none hidden sm:block leading-none"
            style={{ writingMode: "vertical-lr", transform: "rotate(180deg)" }}
          >
            COMMS
          </div>

          <div className="flex-1 border-2 border-[#1a1a1a] bg-[#f0f0f0] p-1.5 flex items-center">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask the Dragon Warrior..."
              rows={1}
              className="flex-1 border bg-transparent outline-none text-white placeholder-white/40 text-sm font-sans resize-none py-1 px-2 custom-scrollbar"
              style={{ minHeight: "38px", backgroundColor: "#000000", borderColor: "#fbf5f5" }}
            />
          </div>

          {(isLoading || isSpeaking || isLiveActive) && (
            <button
              type="button"
              onClick={onStopChat}
              className="font-mono text-xs font-black uppercase tracking-[0.1em] px-4 py-4 border-2 border-[#1a1a1a] bg-[#1a1a1a] text-white hover:bg-[#ff4d00] hover:translate-y-[-2px] hover:-translate-x-[2px] hover:shadow-[4px_4px_0_#1a1a1a] active:translate-y-0 active:translate-x-0 active:shadow-none shadow-[2px_2px_0_#1a1a1a] transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>STOP</span>
            </button>
          )}

          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className={`font-mono text-xs font-black uppercase tracking-[0.1em] px-5 py-4 border-2 border-[#1a1a1a] transition-all cursor-pointer ${
              !input.trim() || isLoading
                ? "bg-white text-[#1a1a1a]/20 border-[#1a1a1a]/20 cursor-not-allowed shadow-none"
                : "bg-[#ff4d00] text-white hover:translate-y-[-2px] hover:-translate-x-[2px] hover:shadow-[4px_4px_0_#1a1a1a] active:translate-y-0 active:translate-x-0 active:shadow-none shadow-[2px_2px_0_#1a1a1a]"
            }`}
          >
            TRANSMIT
          </button>
        </form>

        <div className="flex items-center justify-between mt-3 text-[9px] font-mono font-bold uppercase tracking-widest text-white/50 select-none px-1">
          <span>JADE PALACE // PO v2.0.0</span>
          <span>Powered by Gemini 4 Hydrogen & Live 3.8</span>
        </div>
      </div>
    </div>
  );
}
