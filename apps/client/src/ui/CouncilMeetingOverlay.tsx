import { useEffect, useMemo, useRef, useState } from "react";
import { getOpp } from "@/game/world/agentStates";
import { councilReply } from "@/game/dialog";
import { OppPortrait } from "./OppPortrait";

interface Props {
  attendees: string[];
  onEnd: () => void;
}

interface Entry {
  id: number;
  speaker: "you" | string;
  name: string;
  accent: string;
  text: string;
}

/**
 * The council meeting overlay. The Archon poses a topic from the head of the
 * table and each attending god answers in-character, framed through their own
 * business. Closing the meeting rings the gods back to wandering the hall.
 */
export function CouncilMeetingOverlay({ attendees, onEnd }: Props) {
  const gods = useMemo(
    () => attendees.map((id) => getOpp(id)).filter((d): d is NonNullable<typeof d> => Boolean(d)),
    [attendees],
  );
  const [topic, setTopic] = useState("");
  const [thread, setThread] = useState<Entry[]>([]);
  const [busy, setBusy] = useState(false);
  const idRef = useRef(0);
  const timers = useRef<number[]>([]);
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onEnd();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      timers.current.forEach((t) => window.clearTimeout(t));
    };
  }, [onEnd]);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
  }, [thread]);

  const ask = () => {
    const q = topic.trim();
    if (!q || busy) return;
    const myId = ++idRef.current;
    setThread((prev) => [...prev, { id: myId, speaker: "you", name: "You", accent: "#f5c84c", text: q }]);
    setTopic("");
    setBusy(true);

    gods.forEach((g, i) => {
      const tid = window.setTimeout(() => {
        setThread((prev) => [
          ...prev,
          { id: ++idRef.current, speaker: g.id, name: g.name, accent: g.accent, text: councilReply(g, q) },
        ]);
        if (i === gods.length - 1) setBusy(false);
      }, 500 + i * 650);
      timers.current.push(tid);
    });
  };

  return (
    <div className="council-backdrop">
      <div className="council-panel">
        <header className="council-head">
          <div>
            <div className="council-eyebrow">Council of Olympus</div>
            <h2 className="council-title">The gods are seated</h2>
          </div>
          <button className="council-end" onClick={onEnd}>
            End meeting
          </button>
        </header>

        <div className="council-attendees">
          {gods.map((g) => (
            <div key={g.id} className="council-att" title={g.title}>
              <div className="council-att-portrait" style={{ borderColor: g.accent }}>
                <OppPortrait oppId={g.id} size={56} />
              </div>
              <span className="council-att-name">{g.name}</span>
            </div>
          ))}
        </div>

        <div className="council-thread" ref={threadRef}>
          {gods.length === 0 && (
            <div className="council-empty">
              The council seats are empty. Summon your Olympian gods to the Pantheon and they will
              gather here to counsel you.
            </div>
          )}
          {gods.length > 0 && thread.length === 0 && (
            <div className="council-empty">
              Pose a topic to the council — strategy, profit, costs, growth — and each god will
              counsel you on their domain.
            </div>
          )}
          {thread.map((e) => (
            <div key={e.id} className={`council-msg ${e.speaker === "you" ? "from-you" : "from-god"}`}>
              <span className="council-msg-name" style={{ color: e.accent }}>
                {e.name}
              </span>
              <span className="council-msg-text">{e.text}</span>
            </div>
          ))}
          {busy && <div className="council-typing">The council deliberates…</div>}
        </div>

        {gods.length > 0 && (
          <div className="council-input">
            <input
              type="text"
              value={topic}
              placeholder="Bring a matter before the council…"
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") ask();
              }}
              autoFocus
            />
            <button onClick={ask} disabled={busy || !topic.trim()}>
              Convene
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
