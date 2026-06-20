import { useCallback, useState } from "react";
import { bridge } from "@/game/EventBridge";
import type { ChatMessage, OppDialogData } from "@/types/game";
import { useBridge } from "./useBridge";
import { InteractionDialog } from "./InteractionDialog";
import { HudLayer } from "./HudLayer";

/**
 * Root React overlay layer rendered on top of the Phaser canvas. Owns the
 * interaction dialog (open state + chat thread) and translates between bridge
 * events and the dialog UI. HUD widgets are layered in alongside this.
 */
export function GameOverlay() {
  const [dialog, setDialog] = useState<OppDialogData | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useBridge(
    "game:dialog-open",
    useCallback((data: OppDialogData) => {
      setDialog(data);
      setMessages([{ from: "opp", text: data.greeting }]);
    }, []),
  );

  useBridge(
    "game:opp-reply",
    useCallback((payload: { oppId: string; text: string }) => {
      setMessages((prev) => [...prev, { from: "opp", text: payload.text }]);
    }, []),
  );

  const handleSend = useCallback(
    (text: string) => {
      if (!dialog) return;
      setMessages((prev) => [...prev, { from: "you", text }]);
      bridge.emit("ui:send-chat", { oppId: dialog.oppId, text });
    },
    [dialog],
  );

  const handleClose = useCallback(() => {
    setDialog(null);
    setMessages([]);
    bridge.emit("ui:close-dialog", undefined);
  }, []);

  const handleEnterTemple = useCallback(
    (locationId: string) => {
      setDialog(null);
      setMessages([]);
      bridge.emit("ui:close-dialog", undefined);
      bridge.emit("ui:enter-location", { locationId });
    },
    [],
  );

  return (
    <div className="overlay-root">
      <div className="vignette" aria-hidden="true" />
      <HudLayer />
      {dialog && (
        <InteractionDialog
          data={dialog}
          messages={messages}
          onSend={handleSend}
          onClose={handleClose}
          onEnterTemple={handleEnterTemple}
        />
      )}
    </div>
  );
}
