import { useCallback, useEffect, useState } from "react";
import { agentApi, type DocumentRecord } from "@/net/agentApi";

interface Props {
  onClose: () => void;
}

export function DocumentWorkspace({ onClose }: Props) {
  const [docs, setDocs] = useState<DocumentRecord[]>([]);
  const [selected, setSelected] = useState<DocumentRecord | null>(null);

  const refresh = useCallback(async () => {
    const { documents } = await agentApi.documents();
    setDocs(documents);
    if (selected) {
      const updated = documents.find((d) => d.id === selected.id);
      if (updated) setSelected(updated);
    }
  }, [selected]);

  useEffect(() => {
    void refresh();
    const id = setInterval(() => void refresh(), 5000);
    return () => clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const open = async (id: number) => {
    const { document: d } = await agentApi.document(id);
    setSelected(d);
  };

  return (
    <div className="dash-backdrop" onClick={onClose}>
      <div className="dash-panel doc-panel" onClick={(e) => e.stopPropagation()}>
        <header className="treasury-header">
          <div>
            <h2>Scriptorium</h2>
            <p className="treasury-sub">Zeus research documents — newest first</p>
          </div>
          <button type="button" className="tyche-btn tyche-btn--ghost" onClick={onClose}>
            Close
          </button>
        </header>

        <div className="doc-grid">
          <aside className="doc-list">
            {docs.map((d) => (
              <button
                key={d.id}
                type="button"
                className={`doc-item doc-item--${d.status} ${selected?.id === d.id ? "active" : ""}`}
                onClick={() => void open(d.id)}
              >
                <strong>{d.title}</strong>
                <span className={`doc-pill doc-pill--${d.status}`}>{d.status}</span>
                <small>{new Date(d.createdAt).toLocaleString()}</small>
              </button>
            ))}
            {docs.length === 0 && <p className="tyche-muted">No documents yet. Ask Zeus to research something.</p>}
          </aside>
          <main className="doc-view">
            {selected ? (
              <>
                <h3>{selected.title}</h3>
                {selected.summary && <p className="doc-summary">{selected.summary}</p>}
                <pre className="doc-content">{selected.contentMd || "Working…"}</pre>
              </>
            ) : (
              <p className="tyche-muted">Select a document</p>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
