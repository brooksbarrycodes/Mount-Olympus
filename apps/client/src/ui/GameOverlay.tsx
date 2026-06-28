import { useCallback, useEffect, useState } from "react";
import { bridge } from "@/game/EventBridge";
import type { ChatMessage, OppDialogData } from "@/types/game";
import { useBridge } from "./useBridge";
import { InteractionDialog } from "./InteractionDialog";
import { HudLayer } from "./HudLayer";
import { CommandDashboard } from "./CommandDashboard";
import { ControlCenter } from "./ControlCenter";
import { CouncilMeetingOverlay } from "./CouncilMeetingOverlay";
import { TycheTradingFloor } from "./TycheTradingFloor";
import { TreasuryBreakdown } from "./TreasuryBreakdown";
import { MissionsOverlay } from "./MissionsOverlay";
import { DocumentWorkspace } from "./DocumentWorkspace";
import { agentApi, type ZeusSessionSummary } from "@/net/agentApi";
import { resolveZeusReply, sessionToChatMessages } from "@/game/dialog";
import {
  isZeusVoiceMuted,
  setZeusVoiceMuted,
  speakZeus,
  stopZeusVoice,
  primeZeusAudio,
  setZeusVoiceErrorHandler,
  testZeusVoice,
} from "@/audio/zeusVoice";
import { speakOracle } from "@/audio/oracleVoice";

/**
 * Root React overlay layer rendered on top of the Phaser canvas. Owns the
 * interaction dialog (open state + chat thread) and translates between bridge
 * events and the dialog UI. HUD widgets are layered in alongside this.
 */
export function GameOverlay() {
  const [dialog, setDialog] = useState<OppDialogData | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [thinking, setThinking] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [zeusSessionId, setZeusSessionId] = useState<number | null>(null);
  const [zeusSessions, setZeusSessions] = useState<ZeusSessionSummary[]>([]);
  const [voiceMuted, setVoiceMuted] = useState(isZeusVoiceMuted);
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [controlOpen, setControlOpen] = useState(false);
  const [meeting, setMeeting] = useState<string[] | null>(null);
  const [tycheOpen, setTycheOpen] = useState(false);
  const [treasuryOpen, setTreasuryOpen] = useState(false);
  const [missionsOpen, setMissionsOpen] = useState(false);
  const [documentsOpen, setDocumentsOpen] = useState(false);
  const [voiceToast, setVoiceToast] = useState<string | null>(null);

  useEffect(() => {
    setZeusVoiceErrorHandler((msg) => {
      setVoiceToast(msg);
      window.setTimeout(() => setVoiceToast(null), 5000);
    });
    return () => setZeusVoiceErrorHandler(null);
  }, []);

  const refreshZeusSessions = useCallback(async () => {
    try {
      const { sessions } = await agentApi.zeusSessions();
      setZeusSessions(sessions);
    } catch {
      /* list refresh is best-effort */
    }
  }, []);

  const appendZeusOpening = useCallback(async (sessionId: number) => {
    try {
      const { text } = await agentApi.zeusOpening(sessionId);
      setMessages((prev) => [...prev, { from: "opp", text }]);
      speakZeus(text);
      void refreshZeusSessions();
    } catch {
      /* opening is best-effort; chat still works without it */
    }
  }, [refreshZeusSessions]);

  const loadZeusSession = useCallback(async (sessionId: number) => {
    const { session } = await agentApi.zeusSession(sessionId);
    setZeusSessionId(sessionId);
    setMessages(sessionToChatMessages(session.messages, ""));
  }, []);

  useBridge(
    "game:open-tyche-trading",
    useCallback(() => setTycheOpen(true), []),
  );

  useBridge(
    "ui:close-tyche-trading",
    useCallback(() => setTycheOpen(false), []),
  );

  useBridge(
    "game:open-missions",
    useCallback(() => setMissionsOpen(true), []),
  );

  useBridge(
    "game:open-documents",
    useCallback(() => setDocumentsOpen(true), []),
  );

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
      setThinking(false);

      if (data.oppId !== "zeus") {
        setZeusSessionId(null);
        setZeusSessions([]);
        setLoadingHistory(false);
        setMessages([{ from: "opp", text: data.greeting }]);
        return;
      }

      primeZeusAudio();
      setLoadingHistory(true);
      void (async () => {
        try {
          const { sessions } = await agentApi.zeusSessions();
          setZeusSessions(sessions);

          let sessionId: number;
          if (sessions.length > 0) {
            sessionId = sessions[0].id;
          } else {
            const { session } = await agentApi.zeusNewSession();
            sessionId = session.id;
            setZeusSessions([session]);
          }

          await loadZeusSession(sessionId);
          await appendZeusOpening(sessionId);
        } catch {
          setZeusSessionId(null);
          setMessages([]);
        } finally {
          setLoadingHistory(false);
        }
      })();
    }, [loadZeusSession, appendZeusOpening]),
  );

  useBridge(
    "game:opp-reply",
    useCallback((payload: { oppId: string; text: string }) => {
      if (payload.oppId === "zeus") return;
      setMessages((prev) => [...prev, { from: "opp", text: payload.text }]);
      setThinking(false);
      if (payload.oppId === "oracle") speakOracle(payload.text);
    }, []),
  );

  const handleSend = useCallback(
    (text: string) => {
      if (!dialog) return;
      setMessages((prev) => [...prev, { from: "you", text }]);
      setThinking(true);

      if (dialog.oppId === "zeus") {
        primeZeusAudio();
        if (zeusSessionId === null) {
          setMessages((prev) => [
            ...prev,
            {
              from: "opp",
              text: "No active chat session. Close and reopen, or start a new chat.",
            },
          ]);
          setThinking(false);
          return;
        }
        const sessionId = zeusSessionId;
        void resolveZeusReply(sessionId, text)
          .then((reply) => {
            setMessages((prev) => [...prev, { from: "opp", text: reply }]);
            setThinking(false);
            speakZeus(reply);
            void refreshZeusSessions();
            bridge.emit("game:missions-updated", undefined);
          })
          .catch(() => {
            setMessages((prev) => [
              ...prev,
              { from: "opp", text: "Something went wrong reaching Zeus. Try again." },
            ]);
            setThinking(false);
          });
        return;
      }

      bridge.emit("ui:send-chat", { oppId: dialog.oppId, text });
    },
    [dialog, zeusSessionId, refreshZeusSessions],
  );

  const handleNewZeusChat = useCallback(async () => {
    if (!dialog || dialog.oppId !== "zeus") return;
    setLoadingHistory(true);
    try {
      const { session } = await agentApi.zeusNewSession();
      setZeusSessions((prev) => [session, ...prev]);
      setZeusSessionId(session.id);
      setMessages([]);
      await appendZeusOpening(session.id);
    } catch {
      setMessages((prev) => [
        ...prev,
        { from: "opp", text: "Couldn't start a new chat. Is the agent server running?" },
      ]);
    } finally {
      setLoadingHistory(false);
    }
  }, [dialog, appendZeusOpening]);

  const handleSelectZeusSession = useCallback(
    async (sessionId: number) => {
      if (!dialog || dialog.oppId !== "zeus" || sessionId === zeusSessionId) return;
      setLoadingHistory(true);
      try {
        await loadZeusSession(sessionId);
      } catch {
        setMessages((prev) => [
          ...prev,
          { from: "opp", text: "Couldn't load that chat session." },
        ]);
      } finally {
        setLoadingHistory(false);
      }
    },
    [dialog, zeusSessionId, loadZeusSession],
  );

  const handleTestVoice = useCallback(() => {
    setVoiceMuted(false);
    setZeusVoiceMuted(false);
    primeZeusAudio();
    void testZeusVoice();
  }, []);

  const handleToggleVoice = useCallback(() => {
    setVoiceMuted((prev) => {
      const next = !prev;
      setZeusVoiceMuted(next);
      if (next) stopZeusVoice();
      else primeZeusAudio();
      return next;
    });
  }, []);

  const handleClose = useCallback(() => {
    stopZeusVoice();
    setDialog(null);
    setMessages([]);
    setThinking(false);
    setLoadingHistory(false);
    setZeusSessionId(null);
    setZeusSessions([]);
    bridge.emit("ui:close-dialog", undefined);
  }, []);

  const handleEnterTemple = useCallback(
    (locationId: string) => {
      stopZeusVoice();
      setDialog(null);
      setMessages([]);
      setZeusSessionId(null);
      setZeusSessions([]);
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

  const handleCloseTyche = useCallback(() => {
    setTycheOpen(false);
    bridge.emit("ui:close-tyche-trading", undefined);
  }, []);

  const isZeus = dialog?.oppId === "zeus";

  return (
    <div className="overlay-root">
      <div className="vignette" aria-hidden="true" />
      <HudLayer onOpenTreasury={() => setTreasuryOpen(true)} />
      {voiceToast && <div className="toast voice-toast">{voiceToast}</div>}
      {dialog && (
        <InteractionDialog
          data={dialog}
          messages={messages}
          thinking={thinking}
          loadingHistory={loadingHistory}
          sessions={isZeus ? zeusSessions : undefined}
          activeSessionId={isZeus ? (zeusSessionId ?? undefined) : undefined}
          voiceMuted={isZeus ? voiceMuted : undefined}
          onNewChat={isZeus ? handleNewZeusChat : undefined}
          onSelectSession={isZeus ? handleSelectZeusSession : undefined}
          onToggleVoice={isZeus ? handleToggleVoice : undefined}
          onTestVoice={isZeus ? handleTestVoice : undefined}
          onSend={handleSend}
          onClose={handleClose}
          onEnterTemple={handleEnterTemple}
        />
      )}
      {dashboardOpen && <CommandDashboard onClose={handleCloseDashboard} />}
      {controlOpen && <ControlCenter onClose={handleCloseControl} />}
      {meeting && <CouncilMeetingOverlay attendees={meeting} onEnd={handleEndMeeting} />}
      {tycheOpen && <TycheTradingFloor onClose={handleCloseTyche} />}
      {treasuryOpen && <TreasuryBreakdown onClose={() => setTreasuryOpen(false)} />}
      {missionsOpen && <MissionsOverlay onClose={() => setMissionsOpen(false)} />}
      {documentsOpen && <DocumentWorkspace onClose={() => setDocumentsOpen(false)} />}
    </div>
  );
}
