import { useEffect, useRef, useState } from "react";
import type { ChatMessage, OppDialogData } from "@/types/game";
import { STATUS_LABEL } from "@/types/game";
import type { ZeusSessionSummary } from "@/net/agentApi";
import { primeZeusAudio } from "@/audio/zeusVoice";
import { OppPortrait } from "./OppPortrait";

interface Props {
  data: OppDialogData;
  messages: ChatMessage[];
  thinking?: boolean;
  loadingHistory?: boolean;
  sessions?: ZeusSessionSummary[];
  activeSessionId?: number;
  onNewChat?: () => void;
  onSelectSession?: (id: number) => void;
  voiceMuted?: boolean;
  onToggleVoice?: () => void;
  onTestVoice?: () => void;
  onSend: (text: string) => void;
  onClose: () => void;
  onEnterTemple: (locationId: string) => void;
}

function formatSessionTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/**
 * Centered Opp interaction overlay (not full-screen). Shows an animated
 * portrait, live status, and a chat thread at the bottom. Zeus adds a session
 * sidebar for ChatGPT-style chat history.
 */
export function InteractionDialog({
  data,
  messages,
  thinking = false,
  loadingHistory = false,
  sessions,
  activeSessionId,
  onNewChat,
  onSelectSession,
  voiceMuted,
  onToggleVoice,
  onTestVoice,
  onSend,
  onClose,
  onEnterTemple,
}: Props) {
  const [draft, setDraft] = useState("");
  const threadRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isZeus = data.oppId === "zeus" && sessions !== undefined;

  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, thinking, loadingHistory]);

  useEffect(() => {
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [activeSessionId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = () => {
    const text = draft.trim();
    if (!text || thinking || loadingHistory) return;
    if (isZeus) primeZeusAudio();
    onSend(text);
    setDraft("");
  };

  return (
    <div className="dialog-scrim" onMouseDown={onClose}>
      <div
        className={`dialog${isZeus ? " dialog-zeus" : ""}`}
        style={{ ["--accent" as string]: data.accent }}
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={`Conversation with ${data.name}`}
      >
        <header className="dialog-header">
          <div>
            <h2 className="dialog-name">{data.name}</h2>
            <p className="dialog-title">{data.title}</p>
          </div>
          <button className="dialog-close" onClick={onClose} aria-label="Close">
            Esc
          </button>
        </header>

        <div className={`dialog-body${isZeus ? " dialog-body-zeus" : ""}`}>
          {isZeus && (
            <aside className="chat-session-sidebar" aria-label="Chat history">
              <button
                type="button"
                className="chat-new-btn"
                onClick={onNewChat}
                disabled={loadingHistory || thinking}
              >
                + New chat
              </button>
              <div className="chat-session-list">
                {sessions.length === 0 && (
                  <p className="chat-session-empty">No past chats yet.</p>
                )}
                {sessions.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`chat-session-item${s.id === activeSessionId ? " active" : ""}`}
                    onClick={() => onSelectSession?.(s.id)}
                    disabled={loadingHistory || thinking}
                  >
                    <span className="chat-session-title">{s.title}</span>
                    <span className="chat-session-meta">
                      {formatSessionTime(s.updatedAt)}
                      {s.messageCount > 0 ? ` · ${s.messageCount} msgs` : ""}
                    </span>
                  </button>
                ))}
              </div>
            </aside>
          )}

          <aside className="dialog-portrait">
            <div className="portrait-frame">
              <OppPortrait oppId={data.oppId} size={120} />
            </div>
            <div className={`status-chip status-${data.status}`}>{STATUS_LABEL[data.status]}</div>
            {data.enterTemple && (
              <button
                className="enter-temple-btn"
                onClick={() => onEnterTemple(data.enterTemple!.locationId)}
              >
                {data.enterTemple.label}
              </button>
            )}
          </aside>

          <section className="dialog-main">
            <div className="dialog-info">
              <p className="info-domain">{data.domain}</p>
              <div className="info-row">
                <span className="info-label">Doing</span>
                <span className="info-value">{data.activity}</span>
              </div>
              {data.task && (
                <div className="info-row">
                  <span className="info-label">Focus</span>
                  <span className="info-value">{data.task}</span>
                </div>
              )}
            </div>

            <div className="chat-thread" ref={threadRef}>
              {loadingHistory && messages.length === 0 && (
                <div className="chat-line chat-opp chat-thinking" aria-label="Loading chat history">
                  <span className="chat-who">{data.name}</span>
                  <span className="chat-text">Loading conversation…</span>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`chat-line chat-${m.from}`}>
                  <span className="chat-who">{m.from === "you" ? "You" : data.name}</span>
                  <span className="chat-text">{m.text}</span>
                </div>
              ))}
              {thinking && (
                <div className="chat-line chat-opp chat-thinking" aria-label={`${data.name} is thinking`}>
                  <span className="chat-who">{data.name}</span>
                  <span className="chat-text">
                    <span className="thinking-dots">
                      <span />
                      <span />
                      <span />
                    </span>
                  </span>
                </div>
              )}
            </div>

            <div className="chat-input-row">
              {isZeus && onToggleVoice ? (
                <>
                  <button
                    type="button"
                    className={`voice-btn voice-toggle${voiceMuted ? " muted" : " live"}`}
                    onClick={onToggleVoice}
                    title={voiceMuted ? "Unmute Zeus voice" : "Mute Zeus voice"}
                  >
                    {voiceMuted ? "Voice off" : "Voice on"}
                  </button>
                  {onTestVoice && (
                    <button
                      type="button"
                      className="voice-btn voice-test"
                      onClick={onTestVoice}
                      title="Play a short test clip"
                    >
                      Test
                    </button>
                  )}
                </>
              ) : (
                <button className="voice-btn" disabled title="Voice chat coming soon">
                  Hold to speak
                </button>
              )}
              <input
                ref={inputRef}
                className="chat-input"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submit();
                }}
                placeholder={`Message ${data.name}…`}
                disabled={loadingHistory}
              />
              <button className="send-btn" onClick={submit} disabled={thinking || loadingHistory}>
                Send
              </button>
            </div>
            <p className="voice-note">
              {isZeus
                ? "Zeus speaks via ElevenLabs. Toggle voice off anytime."
                : "Voice input + per-Opp voices arrive in a later update."}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
