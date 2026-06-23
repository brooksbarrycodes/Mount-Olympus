import { useCallback, useState } from "react";
import { bridge } from "@/game/EventBridge";
import type { ChatMessage, OppDialogData } from "@/types/game";
import { useBridge } from "./useBridge";
import { InteractionDialog } from "./InteractionDialog";
import { HudLayer } from "./HudLayer";
import { CommandDashboard } from "./CommandDashboard";
import { ControlCenter } from "./ControlCenter";
import { CouncilMeetingOverlay } from "./CouncilMeetingOverlay";

/**
 * Root React overlay layer rendered on top of the Phaser canvas. Owns the
 * interaction dialog (open state + chat thread) and translates between bridge
 * events and the dialog UI. HUD widgets are layered in alongside this.
 */
export function GameOverlay() {
  const [dialog, setDialog] = useState<OppDialogData | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [thinking, setThinking] = useState(false);
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [controlOpen, setControlOpen] = useState(false);
  const [meeting, setMeeting] = useState<string[] | null>(null);

  useBridge(
    "game:open-dashboard",
    useCallback(() => setDashboardOpen(true), []),
  );

  useBridge(
    "game:open-control",
    useCallback(() => setControlOpen(true), []),
  );

  useBridge(
    "game:open-meeting",
    useCallback((payload: { attendees: string[] }) => setMeeting(payload.attendees), []),
  );

  useBridge(
    "game:dialog-open",
    useCallback((data: OppDialogData) => {
      setDialog(data);
      setMessages([{ from: "opp", text: data.greeting }]);
      setThinking(false);
    }, []),
  );

  useBridge(
    "game:opp-reply",
    useCallback((payload: { oppId: string; text: string }) => {
      setMessages((prev) => [...prev, { from: "opp", text: payload.text }]);
      setThinking(false);
    }, []),
  );

  const handleSend = useCallback(
    (text: string) => {
      if (!dialog) return;
      setMessages((prev) => [...prev, { from: "you", text }]);
      setThinking(true);
      bridge.emit("ui:send-chat", { oppId: dialog.oppId, text });
    },
    [dialog],
  );

  const handleClose = useCallback(() => {
    setDialog(null);
    setMessages([]);
    setThinking(false);
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

  const handleCloseDashboard = useCallback(() => {
    setDashboardOpen(false);
    bridge.emit("ui:close-dashboard", undefined);
  }, []);

  const handleCloseControl = useCallback(() => {
    setControlOpen(false);
    bridge.emit("ui:close-control", undefined);
  }, []);

  const handleEndMeeting = useCallback(() => {
    setMeeting(null);
    bridge.emit("ui:end-meeting", undefined);
  }, []);

  return (
    <div className="overlay-root">
      <div className="vignette" aria-hidden="true" />
      <HudLayer />
      {dialog && (
        <InteractionDialog
          data={dialog}
          messages={messages}
          thinking={thinking}
          onSend={handleSend}
          onClose={handleClose}
          onEnterTemple={handleEnterTemple}
        />
      )}
      {dashboardOpen && <CommandDashboard onClose={handleCloseDashboard} />}
      {controlOpen && <ControlCenter onClose={handleCloseControl} />}
      {meeting && <CouncilMeetingOverlay attendees={meeting} onEnd={handleEndMeeting} />}
    </div>
  );
}
