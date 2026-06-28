import { useCallback, useState } from "react";
import {
  isBackgroundMusicMuted,
  setBackgroundMusicMuted,
} from "@/audio/backgroundMusic";

function MusicOnIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 3v10.55A4 4 0 1 0 14 14.17V7h4V3h-6z"
      />
      <path
        fill="currentColor"
        d="M18.5 8.5c1.2 1.35 1.9 3.1 1.9 5s-.7 3.65-1.9 5l-1.4-1.4c.9-1 1.4-2.3 1.4-3.6s-.5-2.6-1.4-3.6l1.4-1.4z"
      />
      <path
        fill="currentColor"
        d="M16 10.5c.55.65.85 1.45.85 2.25s-.3 1.6-.85 2.25l-1.15-1.15c.25-.35.4-.75.4-1.1s-.15-.75-.4-1.1L16 10.5z"
      />
    </svg>
  );
}

function MusicOffIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 3v10.55A4 4 0 0 0 10 14.17V7h4V3h-6z"
      />
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        d="M4 4l16 16"
      />
    </svg>
  );
}

/** Top-bar control for ambient background music mute/unmute. */
export function MusicToggle() {
  const [muted, setMuted] = useState(isBackgroundMusicMuted);

  const toggle = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      setBackgroundMusicMuted(next);
      return next;
    });
  }, []);

  return (
    <button
      type="button"
      className={`music-toggle${muted ? " muted" : ""}`}
      onClick={toggle}
      aria-pressed={muted}
      aria-label={muted ? "Unmute background music" : "Mute background music"}
      title={muted ? "Unmute music" : "Mute music"}
    >
      {muted ? <MusicOffIcon /> : <MusicOnIcon />}
    </button>
  );
}
