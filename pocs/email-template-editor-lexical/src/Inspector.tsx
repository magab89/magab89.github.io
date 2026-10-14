import { useEffect, useMemo, useState } from "react";
import { fromStoredDoc, listEditableTexts, mergeIntoDefault, toStoredDoc } from "./doc";
import { lexicalJsonToHtmlViaLexical } from "./editor/headless";
import { lexicalJsonToHtml, type LexNode } from "./lexicalJson";
import { highlightHtml, highlightJson, prettyHtml } from "./prettyHtml";
import { renderJinja } from "./render";
import { deleteRow, emailFor, fetchRecord, listRows, parseRecord, recompiledBodyMatches, systemDefault } from "./server";
import type { Doc, Node, Slot, TemplateRecord } from "./types";
import { validateDoc } from "./validate";

export type InspectorTab = "record" | "database" | "send" | "json" | "rule";

type Props = {
  tab: InspectorTab;
  onTab: (tab: InspectorTab) => void;
  record: TemplateRecord;
  liveRecord: TemplateRecord;
  dirty: boolean;
  hasErrors: boolean;
  doc: Doc;
  samples: Record<string, string>;
  onSamples: (s: Record<string, string>) => void;
  dbVersion: number;
  onDbChange: () => void;
  onOpen: (record: TemplateRecord, message: string) => void;
};

const bytes = (s: string) => new Blob([s]).size;
const kb = (n: number) => (n < 1024 ? `${n} B` : `${(n / 1024).toFixed(1)} KB`);
const pretty = (value: unknown) => JSON.stringify(value, null, 2);

function download(record: TemplateRecord) {
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
    ["json", "Lexical JSON"],
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
      {props.tab === "json" && <LexicalTab doc={props.doc} />}
      {props.tab === "rule" && <RuleTab record={props.record} doc={props.doc} />}
    </section>
  );
}

function RecordTab({ record, liveRecord, dirty, hasErrors, samples }: Props) {
  const [which, setWhich] = useState<"live" | "saved">("live");
  const [view, setView] = useState<"json" | "jinja" | "rendered">("json");
  const shown = which === "live" ? liveRecord : record;
  const rendered = useMemo(() => (view === "rendered" ? renderJinja(shown.body, samples) : null), [view, shown.body, samples]);
  const matches = useMemo(() => recompiledBodyMatches(shown), [shown]);

  return (
    <div className="tab-body">
      <p className="hint">
        One record per template, stored whole in a JSON column. <code>doc</code> rebuilds the editor. <code>subject</code> and{" "}
        <code>body</code> are the ready Jinja templates that sending uses.
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
        <span>doc {kb(bytes(JSON.stringify(shown.doc)))}</span>
        <span>body {kb(bytes(shown.body))}</span>
        <span className={matches ? "ok" : "bad"}>{matches ? "✓ doc recompiles to this body" : "✗ doc compiles to a different body"}</span>
        {which === "live" && hasErrors && <span className="bad">Has issues, Save would be rejected</span>}
      </p>
      <div className="seg seg-small" role="tablist" aria-label="Format">
        <button role="tab" aria-selected={view === "json"} onClick={() => setView("json")}>
          Record JSON
        </button>
        <button role="tab" aria-selected={view === "jinja"} onClick={() => setView("jinja")}>
          body: Jinja HTML
        </button>
        <button role="tab" aria-selected={view === "rendered"} onClick={() => setView("rendered")}>
          body: rendered
        </button>
      </div>
      {view === "json" && <CodeView lang="json" code={pretty(shown)} fill />}
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
  const variables = fromStoredDoc(chosen.doc).variables;

  return (
    <div className="tab-body">
      <p className="hint">
        The sending side reads only <code>subject</code> and <code>body</code> from the record, renders them with the meeting's
        values, and sends. It never touches <code>doc</code> or Lexical.
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

function LexicalTab({ doc }: { doc: Doc }) {
  return (
    <div className="tab-body">
      <p className="hint">
        Each editable text is stored as the editor's own JSON and reloaded with <code>parseEditorState()</code>. The HTML is derived
        by a small walker that doesn't need Lexical, which is what a Python server would port. The check compares it with Lexical's
        own export.
      </p>
      {listEditableTexts(doc).map(({ address, label, slot }) => {
        if (!slot.content) return null;
        const viaWalker = lexicalJsonToHtml(slot.content, slot.format);
        let viaLexical = "";
        try {
          viaLexical = lexicalJsonToHtmlViaLexical(slot.content, slot.format);
        } catch (e) {
          viaLexical = `error: ${e instanceof Error ? e.message : String(e)}`;
        }
        return (
          <div key={address} className="slot-row">
            <p className="value-label">
              {label} <code>{address}</code> <span className="muted">{slot.format}</span>
            </p>
            <p className="meta-line">
              <span>JSON {kb(bytes(JSON.stringify(slot.content)))}</span>
              <span>HTML {kb(bytes(viaWalker))}</span>
              <span>{countNodes(slot.content.root)} nodes</span>
              <span className={viaWalker === viaLexical ? "ok" : "bad"}>
                {viaWalker === viaLexical ? "✓ walker = Lexical export" : "✗ walker differs"}
              </span>
            </p>
            <CodeView lang="html" code={viaWalker || "(empty)"} />
            <details>
              <summary>Lexical JSON</summary>
              <CodeView lang="json" code={pretty(slot.content)} />
            </details>
          </div>
        );
      })}
    </div>
  );
}

function countNodes(n: LexNode): number {
  return 1 + (n.children ?? []).reduce((sum, c) => sum + countNodes(c), 0);
}

function RuleTab({ record, doc }: { record: TemplateRecord; doc: Doc }) {
  const [tampered, setTampered] = useState(false);
  const def = systemDefault(record.templateType);

  const request = useMemo(() => {
    const t: Doc = structuredClone(toStoredDoc(doc));
    if (!tampered) return t;
    const nodes = topNodes(t);
    const footer = nodes.find((n) => n.id === "footer");
    if (footer) footer.html = "<p>(footer removed by the client)</p>";
    const cta = nodes.find((n) => n.id === "cta");
    const label = cta?.slots.label;
    if (label?.kind === "text") label.value = "Click here!!!";
    t.body.html = t.body.html.replace("max-width:600px", "max-width:2000px");
    const message = nodes.find((n) => n.id === "message")?.slots.text;
    const paragraph = message?.kind === "text" ? message.content?.root.children?.[0] : undefined;
    paragraph?.children?.push(
      { type: "image", src: "https://evil.example/pixel.png", version: 1 },
      {
        type: "link",
        url: "javascript:alert(1)",
        version: 1,
        children: [{ type: "text", text: "click", format: 0, style: "color:red", detail: 0, mode: "normal", version: 1 }],
      },
    );
    return t;
  }, [doc, tampered]);

  const merged = useMemo(() => mergeIntoDefault(def, fromStoredDoc(request)), [def, request]);
  const mergedErrors = useMemo(() => validateDoc(merged), [merged]);
  const same = (id: string) =>
    JSON.stringify(topNodes(def).find((n) => n.id === id)) === JSON.stringify(topNodes(merged).find((n) => n.id === id));
  const checks = [
    { ok: same("footer"), label: "Footer is the system default" },
    ...(topNodes(def).some((n) => n.id === "cta") ? [{ ok: same("cta"), label: "Button label is the system default" }] : []),
    { ok: merged.body.html === def.body.html, label: "Frame HTML is the system default" },
  ];

  return (
    <div className="tab-body">
      <p className="hint">
        The server never trusts the submitted structure. It takes the current default, copies in only the Lexical JSON of the
        editable texts, validates that JSON against an allowlist of node types, then compiles.
      </p>
      <label className="toggle">
        <input type="checkbox" checked={tampered} onChange={(e) => setTampered(e.target.checked)} />
        <span>
          Tamper with the request: drop the footer, rename the button, widen the frame, and inject an image node, a{" "}
          <code>javascript:</code> link and an inline style into the message
        </span>
      </label>
      <ul className="checks">
        {checks.map((c) => (
          <li key={c.label} className={c.ok ? "ok" : "bad"}>
            {c.ok ? "✓" : "✗"} {c.label}
          </li>
        ))}
        <li className={mergedErrors.length ? "bad" : "ok"}>
          {mergedErrors.length ? `✗ Rejected with 422: ${mergedErrors.length} issue(s)` : "✓ Validation passes, save accepted"}
        </li>
      </ul>
      {mergedErrors.length > 0 && (
        <ul className="issues">
          {mergedErrors.map((e, i) => (
            <li key={i}>
              <strong>{e.label}:</strong> {e.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function topNodes(doc: Doc): Node[] {
  const content: Slot | undefined = doc.body.slots.content;
  return content?.kind === "nodes" ? content.nodes : [];
}

export function CodeView({ code, lang, fill }: { code: string; lang: "html" | "json" | "python"; fill?: boolean }) {
  const [copied, setCopied] = useState(false);
  const html = useMemo(
    () => ({ __html: lang === "json" ? highlightJson(code) : highlightHtml(code) }),
    [code, lang],
  );
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
