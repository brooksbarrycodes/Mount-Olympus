import { useEffect, useRef, useState } from "react";
import type { ChatMessage, OppDialogData } from "@/types/game";
import { STATUS_LABEL } from "@/types/game";
import { OppPortrait } from "./OppPortrait";

interface Props {
  data: OppDialogData;
  messages: ChatMessage[];
  onSend: (text: string) => void;
  onClose: () => void;
  onEnterTemple: (locationId: string) => void;
}

/**
 * Centered Opp interaction overlay (not full-screen). Shows an animated
 * portrait, live status, and a chat thread at the bottom. A disabled voice
 * control marks where microphone + per-Opp voices land later.
 */
export function InteractionDialog({ data, messages, onSend, onClose, onEnterTemple }: Props) {
  const [draft, setDraft] = useState("");
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft("");
  };

  return (
    <div className="dialog-scrim" onMouseDown={onClose}>
      <div
        className="dialog"
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

        <div className="dialog-body">
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
                  <span className="info-label">Decree</span>
                  <span className="info-value">{data.task}</span>
                </div>
              )}
            </div>

            <div className="chat-thread" ref={threadRef}>
              {messages.map((m, i) => (
                <div key={i} className={`chat-line chat-${m.from}`}>
                  <span className="chat-who">{m.from === "you" ? "You" : data.name}</span>
                  <span className="chat-text">{m.text}</span>
                </div>
              ))}
            </div>

            <div className="chat-input-row">
              <button className="voice-btn" disabled title="Voice chat coming soon">
                Hold to speak
              </button>
              <input
                className="chat-input"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submit();
                }}
                placeholder={`Message ${data.name}…`}
                autoFocus
              />
              <button className="send-btn" onClick={submit}>
                Send
              </button>
            </div>
            <p className="voice-note">Voice input + per-Opp voices arrive in a later update.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
