import { useCallback, useMemo, useState } from "react";
import chevDIcon from "./assets/icons/chev-d.svg";
import chevLIcon from "./assets/icons/chev-l.svg";
import infoIcon from "./assets/icons/info.svg";
import lockIcon from "./assets/icons/lock.svg";
import peopleIcon from "./assets/icons/people.svg";
import xIcon from "./assets/icons/x.svg";
import { EmailEditor } from "./editor/EmailEditor";
import { Toolbar, type ActiveSlot } from "./editor/Toolbar";
import { Inspector, type InspectorTab } from "./Inspector";
import type { LexicalJson } from "./lexicalJson";
import { renderJinja } from "./render";
import { buildRecord, checkState, defaultRecord, emailFor, saveRecord } from "./server";
import { compileState, emailOf } from "./stateModel";
import { EMAILS } from "./templates";
import type { EmailRecord } from "./types";

const STORAGE_KEY = "email-template-editor-lexical-single:v1";

type Session = { record: EmailRecord; state: LexicalJson; samples: Record<string, string> };

const samplesFor = (state: LexicalJson) => Object.fromEntries((emailOf(state)?.variables ?? []).map((v) => [v.name, v.sample]));
const sessionFor = (record: EmailRecord, samples?: Record<string, string>): Session => ({
  record,
  state: record.editorState,
  samples: samples ?? samplesFor(record.editorState),
});

function loadSession(): Session {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    if (stored?.record && stored?.state) return stored;
  } catch {
    return sessionFor(defaultRecord(EMAILS[0].slug));
  }
  return sessionFor(defaultRecord(EMAILS[0].slug));
}

function persist(session: Session) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    return;
  }
}

type Toast = { kind: "ok" | "bad"; text: string; at?: string } | null;

export function App() {
  const [session, setSessionState] = useState<Session>(loadSession);
  const [active, setActive] = useState<ActiveSlot | null>(null);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [epoch, setEpoch] = useState(0);
  const [noticeOpen, setNoticeOpen] = useState(true);
  const [toast, setToast] = useState<Toast>(null);
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>("record");
  const [dbVersion, setDbVersion] = useState(0);

  const { record, state, samples } = session;
  const email = emailFor(record.templateType);
  const variables = emailOf(state)?.variables ?? [];

  const setSession = useCallback((fn: (s: Session) => Session) => {
    setSessionState((prev) => {
      const next = fn(prev);
      persist(next);
      return next;
    });
  }, []);

  const onChange = useCallback((next: LexicalJson) => setSession((s) => ({ ...s, state: next })), [setSession]);
  const onActive = useCallback((a: ActiveSlot | null) => setActive(a), []);
  const onRejected = useCallback(() => setToast({ kind: "bad", text: "Locked parts can't be changed. That edit was undone." }), []);

  const compiled = useMemo(() => {
    try {
      return compileState(state);
    } catch {
      return { subject: "", body: "" };
    }
  }, [state]);
  const { errors } = useMemo(() => checkState(record.templateType, state), [record.templateType, state]);
  const invalidSlots = useMemo(() => [...new Set(errors.map((e) => e.slotId))], [errors]);
  const dirty = compiled.body !== record.body || compiled.subject !== record.subject;
  const unsavedImport = record.id === null && record.meta.access !== "System default";
  const canSave = (dirty || unsavedImport) && errors.length === 0;
  const liveRecord = useMemo(() => buildRecord(record, state), [record, state]);
  const contentKey = compiled.subject + compiled.body;
  const shownToast = toast && (toast.at === undefined || toast.at === contentKey) ? toast : null;

  const remount = () => {
    setActive(null);
    setEpoch((n) => n + 1);
  };

  const open = (next: EmailRecord, message?: string) => {
    setSession(() => sessionFor(next, next.templateType === record.templateType ? samples : undefined));
    setToast(message ? { kind: "ok", text: message, at: next.subject + next.body } : null);
    remount();
  };

  const confirmLeave = () => !dirty || window.confirm("Discard your unsaved changes?");

  const switchTemplate = (slug: string) => {
    if (slug === record.templateType && record.id === null) return;
    if (confirmLeave()) open(defaultRecord(slug));
  };

  const discard = () => {
    setSession((s) => ({ ...s, state: s.record.editorState }));
    setToast(null);
    remount();
  };

  const save = () => {
    const result = saveRecord(record, state);
    if (!result.ok) {
      setToast({ kind: "bad", text: `Save rejected (${result.status}). ${result.errors.length} issue(s) to fix.`, at: contentKey });
      return;
    }
    setSession((s) => ({ ...s, record: result.record }));
    setDbVersion((v) => v + 1);
    setInspectorTab("record");
    setToast({
      kind: "ok",
      text: result.created ? `Saved as template #${result.record.id}.` : `Template #${result.record.id} updated.`,
      at: result.record.subject + result.record.body,
    });
  };

  const renderedSubject = mode === "preview" ? renderJinja(compiled.subject, samples) : null;
  const renderedBody = mode === "preview" ? renderJinja(compiled.body, samples) : null;
  const status = errors.length
    ? `${errors.length} issue${errors.length > 1 ? "s" : ""} to fix before saving`
    : dirty
      ? "Unsaved changes"
      : unsavedImport
        ? "Imported, not saved yet"
        : record.id === null
          ? "No changes yet"
          : "All changes saved";

  return (
    <div className="page">
      <header className="topbar">
        <button className="back" title="Back to templates" aria-label="Back to templates" onClick={() => switchTemplate(EMAILS[0].slug)}>
          <img src={chevLIcon} width={18} height={18} alt="" />
        </button>
        <div className="topbar-title">
          <span className="topbar-kicker">Edit template · one Lexical document</span>
          <span className="topbar-name">{record.name}</span>
        </div>
        <label className="template-picker">
          <span className="visually-hidden">Email</span>
          <select value={record.templateType} onChange={(e) => switchTemplate(e.target.value)}>
            {EMAILS.map((e) => (
              <option key={e.slug} value={e.slug}>
                {e.name}
              </option>
            ))}
          </select>
        </label>
        <div className="topbar-spacer" />
        <div className="account">
          <span className="account-avatar">
            <img src={peopleIcon} width={18} height={18} alt="" />
          </span>
          <span className="account-text">
            <span className="account-firm">Smith Wealth Partners</span>
            <span className="account-user">Keith Holmes</span>
          </span>
          <img src={chevDIcon} width={14} height={14} alt="" />
        </div>
      </header>

      <div className="content">
        <main className="editor-col">
          {noticeOpen && (
            <div className="notice">
              <img src={infoIcon} width={16} height={16} alt="" />
              <p>
                {record.id === null
                  ? "Changes are saved as a new template. The Acme default stays as it is."
                  : `You're editing template #${record.id}. Saving updates it.`}
              </p>
              <button className="icon-btn" aria-label="Dismiss" onClick={() => setNoticeOpen(false)}>
                <img src={xIcon} width={16} height={16} alt="" />
              </button>
            </div>
          )}

          <Toolbar active={mode === "edit" ? active : null} variables={variables} />

          <div className="legend-row">
            <div className="legend">
              <span className="legend-item">
                <span className="legend-dash" /> You can edit
              </span>
              <span className="legend-item">
                <img src={lockIcon} width={13} height={13} alt="" /> Locked
              </span>
            </div>
            <div className="view-toggle" role="tablist" aria-label="View">
              <button role="tab" aria-selected={mode === "edit"} onClick={() => setMode("edit")}>
                Edit
              </button>
              <button
                role="tab"
                aria-selected={mode === "preview"}
                onClick={() => {
                  setActive(null);
                  setMode("preview");
                }}
              >
                Preview
              </button>
            </div>
          </div>

          {errors.length > 0 && (
            <ul className="issues" role="alert">
              {errors.map((e, i) => (
                <li key={i}>
                  <strong>{e.label}:</strong> {e.message}
                </li>
              ))}
            </ul>
          )}

          <section className="email-canvas" aria-label="Email">
            <div className={`envelope${mode === "edit" ? " envelope-joined" : ""}`}>
              <div className="envelope-row">
                <span className="envelope-label">From</span>
                <span className="envelope-value">
                  {mode === "edit" ? <span className="ph-chip">Advisor name</span> : samples.advisor_name} via Acme Scheduling ·
                  notifications@booking.example.com
                </span>
              </div>
              {mode === "preview" && (
                <div className="envelope-row">
                  <span className="envelope-label">Subject</span>
                  <span className="envelope-value">{renderedSubject?.error ? `⚠ ${renderedSubject.error}` : renderedSubject?.html}</span>
                </div>
              )}
            </div>

            {mode === "edit" ? (
              <EmailEditor
                key={`${record.templateType}:${record.id}:${epoch}`}
                initialState={state}
                variables={variables}
                invalidSlots={invalidSlots}
                onChange={onChange}
                onActive={onActive}
                onRejected={onRejected}
              />
            ) : renderedBody?.error ? (
              <p className="render-error">
                {errors.length
                  ? "The preview can't render while there are issues to fix. Sending renders strictly too, so it would fail there as well."
                  : `Render failed: ${renderedBody.error}`}
              </p>
            ) : (
              <iframe className="preview-frame" title="Email preview" sandbox="allow-popups" srcDoc={renderedBody?.html} />
            )}
          </section>

          {mode === "preview" && (
            <details className="card samples">
              <summary>Sample values for the preview</summary>
              <p className="hint">Clear a value to see fallbacks and conditional blocks react. Rendered with nunjucks, like Jinja on the server.</p>
              <div className="samples-grid">
                {variables.map((v) => (
                  <label key={v.name}>
                    <span>
                      {v.label}
                      {v.fallback !== undefined && <em> · fallback “{v.fallback}”</em>}
                    </span>
                    <input
                      value={samples[v.name] ?? ""}
                      onChange={(e) => setSession((s) => ({ ...s, samples: { ...s.samples, [v.name]: e.target.value } }))}
                    />
                  </label>
                ))}
              </div>
            </details>
          )}

          <div className="save-bar">
            <span className={`save-status${errors.length || shownToast?.kind === "bad" ? " bad" : ""}`}>
              {shownToast ? shownToast.text : status}
            </span>
            <div className="save-actions">
              <button className="btn-discard" disabled={!dirty} onClick={discard}>
                Discard
              </button>
              <button className="btn-save" disabled={!canSave} onClick={save}>
                {record.id === null ? "Save as new template" : "Save changes"}
              </button>
            </div>
          </div>
        </main>

        <aside className="details-col">
          <section className="card details-card">
            <h2>{record.name}</h2>
            <p className="details-desc">{record.description}</p>
            <dl>
              <div>
                <dt>Type</dt>
                <dd>
                  <span className="badge">{record.meta.kind}</span>
                </dd>
              </div>
              <div>
                <dt>Purpose</dt>
                <dd>{email.purpose}</dd>
              </div>
              <div>
                <dt>Sent to</dt>
                <dd>{record.meta.sentTo}</dd>
              </div>
              <div>
                <dt>Access</dt>
                <dd>
                  <span className="badge">{record.meta.access === "System default" ? "Acme default" : "Account template"}</span>
                </dd>
              </div>
              <div>
                <dt>Created by</dt>
                <dd>{record.meta.createdBy}</dd>
              </div>
              <div>
                <dt>Updated</dt>
                <dd>{formatDate(record.meta.updatedAt)}</dd>
              </div>
            </dl>
          </section>

          <Inspector
            tab={inspectorTab}
            onTab={setInspectorTab}
            record={record}
            liveRecord={liveRecord}
            dirty={dirty}
            hasErrors={errors.length > 0}
            samples={samples}
            onSamples={(s) => setSession((prev) => ({ ...prev, samples: s }))}
            dbVersion={dbVersion}
            onDbChange={() => setDbVersion((v) => v + 1)}
            onOpen={(r, how) => {
              if (confirmLeave()) open(r, how);
            }}
          />
        </aside>
      </div>
    </div>
  );
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} at ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
}
