import type { LexicalEditor } from "lexical";
import { useCallback, useMemo, useState } from "react";
import { buildCanvasHtml, Canvas } from "./Canvas";
import { compileTemplate } from "./compile";
import { applyContents, fromStoredDoc, layoutKey, listEditableTexts, mergeIntoDefault, SUBJECT, toStoredDoc } from "./doc";
import { lexicalJsonToHtmlViaLexical } from "./editor/headless";
import { SlotEditor } from "./editor/SlotEditor";
import { Toolbar, type ActiveSlot } from "./editor/Toolbar";
import { lexicalJsonToHtml, type LexicalJson, type LexNode } from "./lexicalJson";
import { highlightHtml, prettyHtml } from "./prettyHtml";
import { renderJinja } from "./render";
import {
  buildPayload,
  deleteRow,
  listRows,
  parseSavedPayload,
  recompiledBodyMatches,
  saveTemplate,
  systemDefault,
  type SavedRow,
} from "./server";
import { EMAILS } from "./templates";
import type { Doc, EditableText, Node, Slot, Template, TextSlot } from "./types";
import { validateDoc } from "./validate";

const STORAGE_KEY = "email-template-editor-lexical:v2";

type LoadedFrom = { label: string; storedDoc: string; bodyMatches: boolean };
type SlugState = { doc: Doc; samples: Record<string, string>; loadedFrom?: LoadedFrom };
type Stored = Record<string, SlugState>;

function loadWorkspace(): Stored {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function saveWorkspace(state: Stored) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    return;
  }
}

const defaultSamples = (doc: Doc) => Object.fromEntries(doc.variables.map((v) => [v.name, v.sample]));
const freshState = (slug: string): SlugState => ({ doc: systemDefault(slug), samples: defaultSamples(systemDefault(slug)) });
const bytes = (s: string) => new Blob([s]).size;
const kb = (n: number) => (n < 1024 ? `${n} B` : `${(n / 1024).toFixed(1)} KB`);

type Tab = "preview" | "json" | "jinja" | "rule" | "saved";
type Flash = { kind: "ok" | "bad"; text: string } | null;

export function App() {
  const [slug, setSlug] = useState(EMAILS[0].slug);
  const [stored, setStored] = useState<Stored>(loadWorkspace);
  const [active, setActive] = useState<ActiveSlot | null>(null);
  const [tab, setTab] = useState<Tab>("preview");
  const [epoch, setEpoch] = useState(0);
  const [rows, setRows] = useState<SavedRow[]>(listRows);
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [flash, setFlash] = useState<Flash>(null);

  const email = EMAILS.find((e) => e.slug === slug)!;
  const state = stored[slug] ?? freshState(slug);
  const { doc, samples, loadedFrom } = state;

  const setSlugState = useCallback(
    (fn: (current: SlugState) => SlugState) =>
      setStored((prev) => {
        const next = { ...prev, [slug]: fn(prev[slug] ?? freshState(slug)) };
        saveWorkspace(next);
        return next;
      }),
    [slug],
  );

  const onChange = useCallback(
    (address: string, content: LexicalJson) =>
      setSlugState((current) => {
        const before = extractOne(current.doc, address);
        if (before && JSON.stringify(before) === JSON.stringify(content)) return current;
        return { ...current, doc: applyContents(current.doc, { [address]: content }) };
      }),
    [setSlugState],
  );

  const editables = useMemo(() => listEditableTexts(doc), [doc]);
  const labels = useMemo(() => new Map(editables.map((e) => [e.address, e.label])), [editables]);

  const onFocus = useCallback(
    (address: string, editor: LexicalEditor, format: TextSlot["format"]) =>
      setActive((prev) => (prev?.editor === editor ? prev : { address, editor, format, label: labels.get(address) ?? address })),
    [labels],
  );

  const template = useMemo(() => compileTemplate(doc), [doc]);
  const errors = useMemo(() => validateDoc(doc), [doc]);
  const invalidAddresses = useMemo(() => new Set(errors.map((e) => e.address)), [errors]);
  const layout = layoutKey(doc);
  const canvas = useMemo(() => buildCanvasHtml(doc, samples), [layout, samples]);
  const unchangedSinceLoad = loadedFrom ? JSON.stringify(toStoredDoc(doc)) === loadedFrom.storedDoc : false;

  const remount = () => {
    setActive(null);
    setEpoch((n) => n + 1);
  };

  const switchEmail = (next: string) => {
    setActive(null);
    setFlash(null);
    setSlug(next);
  };

  const reset = () => {
    setSlugState(() => freshState(slug));
    setFlash(null);
    remount();
  };

  const save = () => {
    const result = saveTemplate(slug, doc);
    if (!result.ok) {
      setFlash({ kind: "bad", text: `Save rejected with ${result.status}: ${result.errors.length} validation error(s). Fix the texts marked in red.` });
      return;
    }
    setRows(listRows());
    setSelectedRow(result.row.id);
    setTab("saved");
    setFlash({ kind: "ok", text: `Saved as row #${result.row.id}.` });
  };

  const loadPayload = (payload: Template, templateType: string, label: string) => {
    const loaded = fromStoredDoc(payload.doc);
    setStored((prev) => {
      const current = prev[templateType] ?? freshState(templateType);
      const next = {
        ...prev,
        [templateType]: {
          ...current,
          doc: loaded,
          loadedFrom: { label, storedDoc: JSON.stringify(payload.doc), bodyMatches: recompiledBodyMatches(payload) },
        },
      };
      saveWorkspace(next);
      return next;
    });
    setSlug(templateType);
    setFlash({ kind: "ok", text: `Loaded ${label} into the editor.` });
    remount();
  };

  const removeRow = (id: number) => {
    deleteRow(id);
    setRows(listRows());
    if (selectedRow === id) setSelectedRow(null);
  };

  const subject = editables.find((e) => e.address === SUBJECT)!;
  const rowsForEmail = rows.filter((r) => r.templateType === slug);

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>Email template editor</h1>
          <p className="app-sub">Lexical, one small editor per editable text. Editable texts are stored as Lexical JSON.</p>
        </div>
        <div className="app-actions">
          <div className="segmented" role="tablist" aria-label="Email">
            {EMAILS.map((e) => (
              <button key={e.slug} role="tab" aria-selected={e.slug === slug} onClick={() => switchEmail(e.slug)}>
                {e.name}
              </button>
            ))}
          </div>
          <button className="ghost" onClick={reset}>
            Reset to default
          </button>
          <button className="primary" onClick={save}>
            Save
          </button>
        </div>
      </header>

      {flash && (
        <p className={`flash ${flash.kind}`} role="status">
          {flash.text}
        </p>
      )}

      <main className="layout">
        <section className="editor-col" aria-label="Editor">
          <Toolbar active={active} variables={doc.variables} />
          {loadedFrom && (
            <div className="loaded-banner">
              <span>
                Editing <strong>{loadedFrom.label}</strong>
              </span>
              <span className={loadedFrom.bodyMatches ? "ok" : "bad"}>
                {loadedFrom.bodyMatches ? "✓ Stored JSON recompiles to the stored HTML" : "✗ Stored JSON recompiles to different HTML"}
              </span>
              <span className={unchangedSinceLoad ? "ok" : "muted"}>
                {unchangedSinceLoad ? "✓ Editor JSON is identical to the stored JSON" : "• Edited since load"}
              </span>
            </div>
          )}
          {errors.length > 0 && (
            <ul className="errors" role="alert">
              {errors.map((e, i) => (
                <li key={i}>
                  <strong>{e.label}:</strong> {e.message}
                </li>
              ))}
            </ul>
          )}
          <div className="email-card" key={`${slug}:${epoch}`}>
            <div className="subject-row">
              <span className="subject-label">Subject</span>
              <SlotEditor
                address={SUBJECT}
                slot={subject.slot}
                variables={doc.variables}
                invalid={invalidAddresses.has(SUBJECT)}
                onChange={onChange}
                onFocus={onFocus}
              />
            </div>
            {canvas.error ? (
              <p className="render-error">Couldn't render the layout: {canvas.error}</p>
            ) : (
              <Canvas
                key={canvas.html}
                html={canvas.html}
                editables={editables.filter((e) => e.address !== SUBJECT)}
                variables={doc.variables}
                invalidAddresses={invalidAddresses}
                onChange={onChange}
                onFocus={onFocus}
              />
            )}
          </div>
          <Legend />
        </section>

        <section className="side-col" aria-label="Output">
          <div className="tabs" role="tablist">
            {(
              [
                ["preview", "Preview"],
                ["json", "Lexical JSON"],
                ["jinja", "Compiled Jinja"],
                ["rule", "Save rule"],
                ["saved", `Saved (${rowsForEmail.length})`],
              ] as const
            ).map(([id, label]) => (
              <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>
                {label}
              </button>
            ))}
          </div>
          <div className="panel">
            {tab === "preview" && (
              <PreviewPanel
                doc={doc}
                subject={template.subject}
                body={template.body}
                samples={samples}
                hasErrors={errors.length > 0}
                onSamples={(s) => setSlugState((c) => ({ ...c, samples: s }))}
              />
            )}
            {tab === "json" && <JsonPanel editables={editables} />}
            {tab === "jinja" && <JinjaPanel subject={template.subject} body={template.body} samples={samples} />}
            {tab === "rule" && <RulePanel slug={slug} working={doc} />}
            {tab === "saved" && (
              <SavedPanel
                emailName={email.name}
                slug={slug}
                working={doc}
                rows={rowsForEmail}
                selected={selectedRow}
                onSelect={setSelectedRow}
                onLoad={(row) => loadPayload(row.payload, row.templateType, `row #${row.id}`)}
                onImport={(payload) => loadPayload(payload, slug, "pasted JSON")}
                onDelete={removeRow}
              />
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function extractOne(doc: Doc, address: string): LexicalJson | undefined {
  return listEditableTexts(doc).find((e) => e.address === address)?.slot.content;
}

function Legend() {
  return (
    <ul className="legend">
      <li>
        <span className="legend-swatch editable" /> Editable text, stored as Lexical JSON
      </li>
      <li>
        <span className="var-chip">Client first name</span> Variable node, compiled to <code>{"{{ client_first_name }}"}</code>
      </li>
      <li>Everything else is locked layout from the system default, rendered with sample values.</li>
      <li>
        Type <code>{"{{ firm_name }}"}</code> to get a chip. Unknown names stay as text and fail validation.
      </li>
    </ul>
  );
}

function PreviewPanel({
  doc,
  subject,
  body,
  samples,
  hasErrors,
  onSamples,
}: {
  doc: Doc;
  subject: string;
  body: string;
  samples: Record<string, string>;
  hasErrors: boolean;
  onSamples: (s: Record<string, string>) => void;
}) {
  const renderedSubject = renderJinja(subject, samples);
  const renderedBody = renderJinja(body, samples);
  return (
    <>
      <div className="inbox-head">
        <p>
          <span>From</span> {samples.advisor_first_name} {samples.advisor_last_name} via Acme Scheduling
        </p>
        <p>
          <span>Subject</span> <strong>{renderedSubject.error ? "⚠ " + renderedSubject.error : renderedSubject.html}</strong>
        </p>
      </div>
      {renderedBody.error ? (
        <p className="render-error">
          {hasErrors
            ? "The preview can't render while the template has validation errors. Sending renders strictly too, so an unknown variable would fail there as well."
            : `Render failed: ${renderedBody.error}`}
        </p>
      ) : (
        <iframe className="preview-frame" title="Email preview" sandbox="allow-popups" srcDoc={renderedBody.html} />
      )}
      <details className="samples">
        <summary>Sample values</summary>
        <p className="hint">Clear a value to see fallbacks and conditional blocks react. Rendered with nunjucks, the same way the dashboard previews.</p>
        <div className="samples-grid">
          {doc.variables.map((v) => (
            <label key={v.name}>
              <span>
                {v.label}
                {v.fallback !== undefined && <em> · fallback “{v.fallback}”</em>}
              </span>
              <input value={samples[v.name] ?? ""} onChange={(e) => onSamples({ ...samples, [v.name]: e.target.value })} />
            </label>
          ))}
        </div>
      </details>
    </>
  );
}

function JsonPanel({ editables }: { editables: EditableText[] }) {
  return (
    <>
      <p className="hint">
        Each editable text is stored as the editor's own JSON (<code>editorState.toJSON()</code>) and reloaded with{" "}
        <code>parseEditorState()</code>. The HTML next to it is derived from the JSON by a 40-line walker that doesn't need Lexical,
        which is what a Python server would port. The check compares it with Lexical's own export.
      </p>
      {editables.map(({ address, label, slot }) => {
        if (!slot.content) return null;
        const json = JSON.stringify(slot.content);
        const viaWalker = lexicalJsonToHtml(slot.content, slot.format);
        let viaLexical = "";
        try {
          viaLexical = lexicalJsonToHtmlViaLexical(slot.content, slot.format);
        } catch (e) {
          viaLexical = `error: ${e instanceof Error ? e.message : String(e)}`;
        }
        return (
          <div key={address} className="value-row">
            <p className="value-label">
              {label} <code>{address}</code> <span className="muted">{slot.format}</span>
            </p>
            <p className="meta-line">
              <span>JSON {kb(bytes(json))}</span>
              <span>HTML {kb(bytes(viaWalker))}</span>
              <span>{countNodes(slot.content.root)} nodes</span>
              <span className={viaWalker === viaLexical ? "ok" : "bad"}>
                {viaWalker === viaLexical ? "✓ walker = Lexical export" : "✗ walker differs from Lexical export"}
              </span>
            </p>
            <pre>{viaWalker || "(empty)"}</pre>
            <details className="json-details">
              <summary>Lexical JSON</summary>
              <pre>{JSON.stringify(slot.content, null, 2)}</pre>
            </details>
          </div>
        );
      })}
    </>
  );
}

function countNodes(n: LexNode): number {
  return 1 + (n.children ?? []).reduce((sum, c) => sum + countNodes(c), 0);
}

function JinjaPanel({ subject, body, samples }: { subject: string; body: string; samples: Record<string, string> }) {
  const [mode, setMode] = useState<"template" | "rendered">("template");
  const rendered = useMemo(() => (mode === "rendered" ? renderJinja(body, samples) : null), [mode, body, samples]);
  const renderedSubject = mode === "rendered" ? renderJinja(subject, samples) : null;
  return (
    <>
      <p className="hint">
        {mode === "template"
          ? "The compiled template stored next to the doc. Sending renders this as-is, so nothing is built at send time. Rich text gets inline styles per tag, and variables with a fallback get a default() filter."
          : "The same template rendered with the sample values, which is the HTML an email client would receive."}
      </p>
      <div className="segmented small-seg" role="tablist" aria-label="Jinja view">
        <button role="tab" aria-selected={mode === "template"} onClick={() => setMode("template")}>
          Jinja template
        </button>
        <button role="tab" aria-selected={mode === "rendered"} onClick={() => setMode("rendered")}>
          Rendered with samples
        </button>
      </div>
      <p className="value-label">subject</p>
      <CodeView code={mode === "template" ? subject : (renderedSubject?.html ?? renderedSubject?.error ?? "")} />
      <p className="value-label">body</p>
      {rendered?.error ? (
        <p className="render-error">Render failed: {rendered.error}</p>
      ) : (
        <CodeView code={prettyHtml(mode === "template" ? body : (rendered?.html ?? ""))} tall />
      )}
    </>
  );
}

function CodeView({ code, tall }: { code: string; tall?: boolean }) {
  const [copied, setCopied] = useState(false);
  const html = useMemo(() => ({ __html: highlightHtml(code) }), [code]);
  const copy = () => {
    navigator.clipboard?.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    });
  };
  return (
    <div className="code-view">
      <button className="ghost small code-copy" onClick={copy}>
        {copied ? "Copied" : "Copy"}
      </button>
      <pre className={`code${tall ? " tall" : ""}`} dangerouslySetInnerHTML={html} />
    </div>
  );
}

function RulePanel({ slug, working }: { slug: string; working: Doc }) {
  const [tampered, setTampered] = useState(false);
  const def = systemDefault(slug);

  const request = useMemo(() => {
    const t: Doc = structuredClone(toStoredDoc(working));
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
  }, [working, tampered]);

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
    <>
      <p className="hint">
        The server never trusts the submitted structure. It loads the current default, copies in only the Lexical JSON of the
        editable slots, then validates that JSON against an allowlist of node types and compiles it.
      </p>
      <label className="toggle">
        <input type="checkbox" checked={tampered} onChange={(e) => setTampered(e.target.checked)} />
        Tamper with the request: drop the footer, rename the button, widen the frame, and inject an image node, a{" "}
        <code>javascript:</code> link and an inline style into the message JSON
      </label>
      <ul className="checks">
        {checks.map((c) => (
          <li key={c.label} className={c.ok ? "ok" : "bad"}>
            {c.ok ? "✓" : "✗"} {c.label}
          </li>
        ))}
        <li className={mergedErrors.length ? "bad" : "ok"}>
          {mergedErrors.length ? `✗ Rejected with 422: ${mergedErrors.length} validation error(s)` : "✓ Validation passes, save accepted"}
        </li>
      </ul>
      {mergedErrors.length > 0 && (
        <ul className="errors">
          {mergedErrors.map((e, i) => (
            <li key={i}>
              <strong>{e.label}:</strong> {e.message}
            </li>
          ))}
        </ul>
      )}
      <p className="value-label">Request body the editor sends</p>
      <pre>{JSON.stringify({ doc: request }, null, 2).slice(0, 4000)}…</pre>
    </>
  );
}

function SavedPanel({
  emailName,
  slug,
  working,
  rows,
  selected,
  onSelect,
  onLoad,
  onImport,
  onDelete,
}: {
  emailName: string;
  slug: string;
  working: Doc;
  rows: SavedRow[];
  selected: number | null;
  onSelect: (id: number | null) => void;
  onLoad: (row: SavedRow) => void;
  onImport: (payload: Template) => void;
  onDelete: (id: number) => void;
}) {
  const [view, setView] = useState<"doc" | "body" | "all">("doc");
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const row = rows.find((r) => r.id === selected) ?? null;
  const draft = useMemo(() => buildPayload(slug, working).payload, [slug, working]);

  const doImport = () => {
    try {
      onImport(parseSavedPayload(importText));
      setImportError(null);
    } catch (e) {
      setImportError(e instanceof Error ? e.message : String(e));
    }
  };

  const shown = row?.payload;
  const shownText = shown
    ? view === "doc"
      ? JSON.stringify(shown.doc, null, 2)
      : view === "body"
        ? prettyHtml(shown.body)
        : JSON.stringify(shown, null, 2)
    : "";

  return (
    <>
      <p className="hint">
        A row is what the database would hold: <code>subject</code> and <code>body</code> ready for Jinja, plus <code>doc</code>,
        which carries the layout, the editable flags and the Lexical JSON of each editable text. Load a row to rebuild the editor
        from <code>doc</code> alone. Rows live in this browser only.
      </p>

      {rows.length === 0 ? (
        <p className="empty">No saved rows for “{emailName}” yet. Edit something and press Save.</p>
      ) : (
        <ul className="rows">
          {[...rows].reverse().map((r) => (
            <li key={r.id} className={r.id === selected ? "selected" : ""}>
              <button className="row-main" onClick={() => onSelect(r.id === selected ? null : r.id)}>
                <strong>#{r.id}</strong> {new Date(r.savedAt).toLocaleString()}
                <span className="muted">
                  {kb(bytes(JSON.stringify(r.payload)))} total · doc {kb(bytes(JSON.stringify(r.payload.doc)))} · body{" "}
                  {kb(bytes(r.payload.body))}
                </span>
              </button>
              <button className="ghost small" onClick={() => onLoad(r)}>
                Load into editor
              </button>
              <button className="ghost small" onClick={() => onDelete(r.id)} aria-label={`Delete row ${r.id}`}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}

      {shown && (
        <>
          <div className="segmented small-seg" role="tablist" aria-label="Row view">
            {(
              [
                ["doc", "doc (reloadable)"],
                ["body", "body (Jinja HTML)"],
                ["all", "whole row"],
              ] as const
            ).map(([id, label]) => (
              <button key={id} role="tab" aria-selected={view === id} onClick={() => setView(id)}>
                {label}
              </button>
            ))}
          </div>
          <CodeView code={shownText} tall />
          <button className="ghost small" onClick={() => navigator.clipboard?.writeText(JSON.stringify(shown, null, 2))}>
            Copy row JSON
          </button>
        </>
      )}

      <details className="import">
        <summary>Load from pasted JSON</summary>
        <p className="hint">Paste a saved row or its payload, for example one copied from the database, then load it into this email.</p>
        <textarea
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder='{"schemaVersion": 2, "subject": "…", "body": "…", "doc": {…}}'
          rows={6}
        />
        <div className="import-actions">
          <button className="ghost small" onClick={() => setImportText(JSON.stringify(draft, null, 2))}>
            Fill with the current draft
          </button>
          <button className="primary small" onClick={doImport} disabled={!importText.trim()}>
            Load
          </button>
        </div>
        {importError && <p className="render-error">{importError}</p>}
      </details>
    </>
  );
}

function topNodes(doc: Doc): Node[] {
  const content: Slot | undefined = doc.body.slots.content;
  return content?.kind === "nodes" ? content.nodes : [];
}
