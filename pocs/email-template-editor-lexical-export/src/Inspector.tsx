import { useEffect, useMemo, useState } from "react";
import type { LexicalJson, LexNode } from "./lexicalJson";
import { highlightHtml, highlightJson, prettyHtml } from "./prettyHtml";
import { renderJinja } from "./render";
import { checkState, deleteRow, emailFor, fetchRecord, listRows, parseRecord, recompiledBodyMatches } from "./server";
import { slotLabel, slotRequired } from "./slotRules";
import { emailOf, slotConditions, slotText, slotsOf } from "./stateModel";
import type { EmailRecord } from "./types";

export type InspectorTab = "record" | "database" | "send" | "slots" | "rule";

type Props = {
  tab: InspectorTab;
  onTab: (tab: InspectorTab) => void;
  record: EmailRecord;
  liveRecord: EmailRecord;
  dirty: boolean;
  hasErrors: boolean;
  samples: Record<string, string>;
  onSamples: (s: Record<string, string>) => void;
  dbVersion: number;
  onDbChange: () => void;
  onOpen: (record: EmailRecord, message: string) => void;
};

const bytes = (s: string) => new Blob([s]).size;
const kb = (n: number) => (n < 1024 ? `${n} B` : `${(n / 1024).toFixed(1)} KB`);
const pretty = (value: unknown) => JSON.stringify(value, null, 2);
const countNodes = (n: LexNode): number => 1 + (n.children ?? []).reduce((sum, c) => sum + countNodes(c), 0);

function download(record: EmailRecord) {
  const blob = new Blob([pretty(record)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `template-${record.templateType}-${record.id ?? "draft"}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function Inspector(props: Props) {
  const tabs: [InspectorTab, string][] = [
    ["record", "Record"],
    ["database", "Database"],
    ["send", "Send email"],
    ["slots", "Editable areas"],
    ["rule", "Save rule"],
  ];
  return (
    <section className="card inspector">
      <div className="inspector-head">
        <h2>PoC inspector</h2>
        <p className="hint">What the editor saves, what the database holds, and what sending reads.</p>
      </div>
      <div className="seg seg-wrap" role="tablist" aria-label="Inspector">
        {tabs.map(([id, label]) => (
          <button key={id} role="tab" aria-selected={props.tab === id} onClick={() => props.onTab(id)}>
            {label}
          </button>
        ))}
      </div>
      {props.tab === "record" && <RecordTab {...props} />}
      {props.tab === "database" && <DatabaseTab {...props} />}
      {props.tab === "send" && <SendTab {...props} />}
      {props.tab === "slots" && <SlotsTab state={props.liveRecord.editorState} />}
      {props.tab === "rule" && <RuleTab record={props.record} state={props.liveRecord.editorState} />}
    </section>
  );
}

function RecordTab({ record, liveRecord, dirty, hasErrors, samples }: Props) {
  const [which, setWhich] = useState<"live" | "saved">("live");
  const [view, setView] = useState<"record" | "state" | "jinja" | "rendered">("record");
  const shown = which === "live" ? liveRecord : record;
  const rendered = useMemo(() => (view === "rendered" ? renderJinja(shown.body, samples) : null), [view, shown.body, samples]);
  const matches = useMemo(() => recompiledBodyMatches(shown), [shown]);

  return (
    <div className="tab-body">
      <p className="hint">
        <code>editorState</code> is exactly what <code>editor.getEditorState().toJSON()</code> returns, stored without any mapping.
        Locked blocks and editable areas are custom Lexical nodes, so the layout and the rules are part of that JSON.{" "}
        <code>subject</code> and <code>body</code> come from Lexical's own <code>$generateHtmlFromNodes</code> with export overrides.
      </p>
      <div className="row-between">
        <div className="seg" role="tablist" aria-label="Record">
          <button role="tab" aria-selected={which === "live"} onClick={() => setWhich("live")}>
            Live draft{dirty ? " •" : ""}
          </button>
          <button role="tab" aria-selected={which === "saved"} onClick={() => setWhich("saved")}>
            {record.id === null ? "Acme default" : `Saved #${record.id}`}
          </button>
        </div>
        <button className="btn-ghost" onClick={() => download(shown)}>
          Download JSON
        </button>
      </div>
      <p className="meta-line">
        <span>{kb(bytes(JSON.stringify(shown)))} record</span>
        <span>editorState {kb(bytes(JSON.stringify(shown.editorState)))}</span>
        <span>{countNodes(shown.editorState.root)} Lexical nodes</span>
        <span>body {kb(bytes(shown.body))}</span>
        <span className={matches ? "ok" : "bad"}>{matches ? "✓ editorState compiles to this body" : "✗ editorState compiles to a different body"}</span>
        {which === "live" && hasErrors && <span className="bad">Has issues, Save would be rejected</span>}
      </p>
      <div className="seg seg-small" role="tablist" aria-label="Format">
        <button role="tab" aria-selected={view === "record"} onClick={() => setView("record")}>
          Record JSON
        </button>
        <button role="tab" aria-selected={view === "state"} onClick={() => setView("state")}>
          editorState only
        </button>
        <button role="tab" aria-selected={view === "jinja"} onClick={() => setView("jinja")}>
          body: Jinja HTML
        </button>
        <button role="tab" aria-selected={view === "rendered"} onClick={() => setView("rendered")}>
          body: rendered
        </button>
      </div>
      {view === "record" && <CodeView lang="json" code={pretty(shown)} fill />}
      {view === "state" && <CodeView lang="json" code={pretty(shown.editorState)} fill />}
      {view === "jinja" && (
        <>
          <p className="value-label">subject</p>
          <CodeView lang="html" code={shown.subject} />
          <p className="value-label">body</p>
          <CodeView lang="html" code={prettyHtml(shown.body)} fill />
        </>
      )}
      {view === "rendered" &&
        (rendered?.error ? (
          <p className="render-error">Render failed: {rendered.error}</p>
        ) : (
          <>
            <p className="value-label">subject</p>
            <CodeView lang="html" code={renderJinja(shown.subject, samples).html} />
            <p className="value-label">body, with the sample values</p>
            <CodeView lang="html" code={prettyHtml(rendered?.html ?? "")} fill />
          </>
        ))}
    </div>
  );
}

function DatabaseTab({ record, dbVersion, onDbChange, onOpen, onTab }: Props) {
  const rows = useMemo(() => listRows(), [dbVersion]);
  const [loading, setLoading] = useState<number | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [paste, setPaste] = useState("");
  const [importError, setImportError] = useState<string | null>(null);

  const openRow = async (id: number) => {
    setLoading(id);
    const started = performance.now();
    try {
      const fetched = await fetchRecord(id);
      setLog((l) => [`GET /api/email-templates/${id} → 200 in ${Math.round(performance.now() - started)} ms`, ...l].slice(0, 5));
      onOpen(fetched, `Loaded template #${id} from the database.`);
    } catch (e) {
      setLog((l) => [`GET /api/email-templates/${id} → ${e instanceof Error ? e.message : String(e)}`, ...l].slice(0, 5));
    } finally {
      setLoading(null);
    }
  };

  const importText = (text: string, source: string) => {
    try {
      const parsed = parseRecord(text);
      setImportError(null);
      onOpen(parsed, `Imported ${source}.`);
    } catch (e) {
      setImportError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="tab-body">
      <p className="hint">Rows live in this browser and stand in for a table with one JSON column per template.</p>
      {rows.length === 0 ? (
        <p className="empty">No saved templates yet. Edit the email and press Save.</p>
      ) : (
        <ul className="rows">
          {[...rows].reverse().map((r) => (
            <li key={r.id} className={r.id === record.id ? "current" : ""}>
              <div className="row-info">
                <strong>
                  #{r.id} {r.name}
                </strong>
                <span className="muted">
                  {emailFor(r.templateType).name} · {new Date(r.meta.updatedAt).toLocaleString()} · {kb(bytes(JSON.stringify(r)))}
                </span>
              </div>
              <div className="row-actions">
                <button className="btn-ghost" disabled={loading !== null} onClick={() => openRow(r.id!)}>
                  {loading === r.id ? "Loading…" : "Open in editor"}
                </button>
                <button className="btn-ghost" onClick={() => onTab("send")}>
                  Send
                </button>
                <button className="btn-ghost" onClick={() => download(r)}>
                  Download
                </button>
                <button
                  className="btn-ghost"
                  onClick={() => {
                    deleteRow(r.id!);
                    onDbChange();
                  }}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {log.length > 0 && <pre className="log">{log.join("\n")}</pre>}

      <div className="import">
        <p className="value-label">Import a record</p>
        <label className="file-input">
          <input
            type="file"
            accept="application/json,.json"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) importText(await file.text(), file.name);
              e.target.value = "";
            }}
          />
          <span className="btn-ghost">Choose a JSON file…</span>
        </label>
        <textarea value={paste} onChange={(e) => setPaste(e.target.value)} rows={5} placeholder="…or paste a record here" />
        <div className="row-end">
          <button className="btn-primary" disabled={!paste.trim()} onClick={() => importText(paste, "pasted JSON")}>
            Load into editor
          </button>
        </div>
        {importError && <p className="render-error">{importError}</p>}
      </div>
    </div>
  );
}

function SendTab({ liveRecord, samples, onSamples, dbVersion }: Props) {
  const rows = useMemo(() => listRows(), [dbVersion]);
  const [source, setSource] = useState<string>(rows.length ? String(rows[rows.length - 1].id) : "draft");
  const [view, setView] = useState<"email" | "html">("email");
  useEffect(() => {
    if (source !== "draft" && !rows.some((r) => String(r.id) === source)) setSource("draft");
  }, [rows, source]);
  const chosen = source === "draft" ? liveRecord : (rows.find((r) => String(r.id) === source) ?? liveRecord);
  const subject = renderJinja(chosen.subject, samples);
  const body = renderJinja(chosen.body, samples);
  const variables = emailOf(chosen.editorState)?.variables ?? [];

  return (
    <div className="tab-body">
      <p className="hint">
        The sending side reads only <code>subject</code> and <code>body</code> from the record, renders them with the meeting's
        values, and sends. It never touches <code>editorState</code> or Lexical.
      </p>
      <label className="field">
        <span>Template</span>
        <select value={source} onChange={(e) => setSource(e.target.value)}>
          <option value="draft">Current draft (not saved)</option>
          {rows.map((r) => (
            <option key={r.id} value={String(r.id)}>
              #{r.id} {r.name}
            </option>
          ))}
        </select>
      </label>
      <CodeView
        lang="python"
        code={`row = db.fetch_one("select template from email_templates where id = %s", [template_id])
tpl = row["template"]  # the JSON column

env = SandboxedEnvironment(undefined=StrictUndefined, autoescape=True)
subject = env.from_string(tpl["subject"]).render(**context)
html = env.from_string(tpl["body"]).render(**context)
send_email(to=client.email, subject=subject, html=html)`}
      />
      <details className="context">
        <summary>Context values ({variables.length})</summary>
        <div className="samples-grid">
          {variables.map((v) => (
            <label key={v.name}>
              <span>{v.name}</span>
              <input value={samples[v.name] ?? ""} onChange={(e) => onSamples({ ...samples, [v.name]: e.target.value })} />
            </label>
          ))}
        </div>
      </details>
      <div className="sent-head">
        <span className="envelope-label">Subject</span> <strong>{subject.error ? `⚠ ${subject.error}` : subject.html}</strong>
      </div>
      <div className="seg seg-small" role="tablist" aria-label="Sent email view">
        <button role="tab" aria-selected={view === "email"} onClick={() => setView("email")}>
          Email
        </button>
        <button role="tab" aria-selected={view === "html"} onClick={() => setView("html")}>
          Sent HTML
        </button>
      </div>
      {body.error ? (
        <p className="render-error">Render failed: {body.error}</p>
      ) : view === "email" ? (
        <iframe className="sent-frame" title="Sent email" sandbox="allow-popups" srcDoc={body.html} />
      ) : (
        <CodeView lang="html" code={prettyHtml(body.html)} />
      )}
    </div>
  );
}

function SlotsTab({ state }: { state: LexicalJson }) {
  const conditions = slotConditions(state);
  return (
    <div className="tab-body">
      <p className="hint">
        Each <code>email-slot</code> node in the editor state is one editable area. Its children are ordinary Lexical nodes. Its
        <code>wrapper</code> is applied to each paragraph by Lexical's HTML export, and <code>editable: false</code> locks the content.
        Labels, limits, the button look and the "Only if" conditions are derived in code. Shown below: the area's text with variables as
        Jinja placeholders.
      </p>
      {slotsOf(state).map((slot) => (
        <div key={slot.slotId} className="slot-row">
          <p className="value-label">
            {slotLabel(slot.slotId)} <code>{slot.slotId}</code> <span className="muted">{slot.slotFormat}</span>
          </p>
          <p className="meta-line">
            <span>{countNodes(slot)} nodes</span>
            {conditions.get(slot.slotId) && <span>{conditions.get(slot.slotId)}</span>}
            {!slotRequired(slot) && <span>optional</span>}
            {!slot.editable && <span>locked</span>}
          </p>
          <CodeView lang="html" code={slotText(slot) || "(empty)"} />
          <details>
            <summary>The slot node as Lexical serialized it</summary>
            <CodeView lang="json" code={pretty(slot)} />
          </details>
        </div>
      ))}
    </div>
  );
}

function RuleTab({ record, state }: { record: EmailRecord; state: LexicalJson }) {
  const [layout, setLayout] = useState(false);
  const [content, setContent] = useState(false);

  const request = useMemo(() => {
    const t: LexicalJson = structuredClone(state);
    const email = emailOf(t);
    if (!email?.children) return t;
    if (layout) {
      const footer = email.children.find((c) => c.blockId === "footer");
      if (footer) footer.html = "<p>(footer removed by the client)</p>";
      email.children = email.children.filter((c) => c.blockId !== "meeting_details");
      email.frame = email.frame.replace("max-width:600px", "max-width:2000px");
    }
    if (content) {
      const message = email.children.flatMap((c) => (c.type === "email-group" ? (c.children ?? []) : [c])).find((c) => c.slotId === "message");
      const paragraph = message?.children?.[0];
      paragraph?.children?.push(
        { type: "image", src: "https://evil.example/pixel.png", version: 1 },
        {
          type: "link",
          url: "javascript:alert(1)",
          version: 1,
          children: [{ type: "text", text: "click", format: 0, style: "color:red", detail: 0, mode: "normal", version: 1 }],
        },
      );
    }
    return t;
  }, [state, layout, content]);

  const { errors, structureMatches } = useMemo(() => checkState(record.templateType, request), [record.templateType, request]);

  return (
    <div className="tab-body">
      <p className="hint">
        The server compares the structure of the submitted Lexical state with the system default: the frame, the variables, the
        order and HTML of the locked blocks, every area's settings, and the content of areas marked <code>editable: false</code>. Only
        the content inside editable areas may differ.
        That content is then validated against an allowlist of node types. If both pass, the state is stored as submitted.
      </p>
      <label className="toggle">
        <input type="checkbox" checked={layout} onChange={(e) => setLayout(e.target.checked)} />
        <span>Tamper with the locked layout: change the footer, drop the meeting details, widen the frame</span>
      </label>
      <label className="toggle">
        <input type="checkbox" checked={content} onChange={(e) => setContent(e.target.checked)} />
        <span>
          Inject bad content into the message: an image node, a <code>javascript:</code> link and an inline style
        </span>
      </label>
      <ul className="checks">
        <li className={structureMatches ? "ok" : "bad"}>
          {structureMatches ? "✓ Structure matches the system default" : "✗ Structure differs from the system default"}
        </li>
        <li className={errors.length ? "bad" : "ok"}>
          {errors.length ? `✗ Rejected with 422: ${errors.length} issue(s)` : "✓ Accepted, stored exactly as submitted"}
        </li>
      </ul>
      {errors.length > 0 && (
        <ul className="issues">
          {errors.map((e, i) => (
            <li key={i}>
              <strong>{e.label}:</strong> {e.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function CodeView({ code, lang, fill }: { code: string; lang: "html" | "json" | "python"; fill?: boolean }) {
  const [copied, setCopied] = useState(false);
  const html = useMemo(() => ({ __html: lang === "json" ? highlightJson(code) : highlightHtml(code) }), [code, lang]);
  return (
    <div className={`code-view${fill ? " fill" : ""}`}>
      <button
        className="btn-ghost code-copy"
        onClick={() =>
          navigator.clipboard?.writeText(code).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          })
        }
      >
        {copied ? "Copied" : "Copy"}
      </button>
      <pre className="code" dangerouslySetInnerHTML={html} />
    </div>
  );
}
