import { useCallback, useEffect, useState } from "react";
import { agentApi, type LinearIssue } from "@/net/agentApi";

interface Props {
  compact?: boolean;
}

export function LinearBoard({ compact = false }: Props) {
  const [issues, setIssues] = useState<LinearIssue[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const { issues: list } = await agentApi.linearIssues();
      setIssues(list);
      setError(null);
    } catch {
      setError("Linear unavailable — check LINEAR_API_KEY on server.");
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = setInterval(() => void refresh(), 60000);
    return () => clearInterval(id);
  }, [refresh]);

  const create = async () => {
    if (!newTitle.trim()) return;
    setBusy(true);
    try {
      await agentApi.linearCreateIssue({ title: newTitle });
      setNewTitle("");
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const complete = async (id: string) => {
    setBusy(true);
    try {
      await agentApi.linearCompleteIssue(id);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const grouped = {
    todo: issues.filter((i) => !/done|complete|cancel/i.test(i.state)),
    done: issues.filter((i) => /done|complete/i.test(i.state)),
  };

  if (error) {
    return <p className="tyche-error">{error}</p>;
  }

  return (
    <div className={`linear-board ${compact ? "linear-board--compact" : ""}`}>
      <div className="linear-toolbar">
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="New issue title…"
          className="missions-input"
          onKeyDown={(e) => e.key === "Enter" && void create()}
        />
        <button type="button" className="tyche-btn" disabled={busy} onClick={() => void create()}>
          Create
        </button>
        <button type="button" className="tyche-btn tyche-btn--ghost" disabled={busy} onClick={() => void refresh()}>
          Refresh
        </button>
      </div>

      {!compact && (
        <div className="linear-kanban">
          <section>
            <h4>Active ({grouped.todo.length})</h4>
            {grouped.todo.map((i) => (
              <IssueRow key={i.id} issue={i} onComplete={() => void complete(i.id)} busy={busy} />
            ))}
          </section>
          <section>
            <h4>Done ({grouped.done.length})</h4>
            {grouped.done.map((i) => (
              <IssueRow key={i.id} issue={i} done busy={busy} />
            ))}
          </section>
        </div>
      )}

      {compact && (
        <ul className="linear-list">
          {issues.slice(0, 8).map((i) => (
            <li key={i.id}>
              <span>{i.identifier}</span> {i.title}
              {!/done/i.test(i.state) && (
                <button type="button" className="linear-done-btn" onClick={() => void complete(i.id)}>
                  ✓
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function IssueRow({
  issue,
  onComplete,
  done,
  busy,
}: {
  issue: LinearIssue;
  onComplete?: () => void;
  done?: boolean;
  busy: boolean;
}) {
  return (
    <div className="linear-issue">
      <div>
        <strong>{issue.identifier}</strong> {issue.title}
        {issue.description && <p className="linear-desc">{issue.description.slice(0, 120)}</p>}
        <small>{issue.state}{issue.dueDate ? ` · due ${issue.dueDate}` : ""}</small>
      </div>
      {!done && onComplete && (
        <button type="button" className="tyche-btn" disabled={busy} onClick={onComplete}>
          Done
        </button>
      )}
    </div>
  );
}
