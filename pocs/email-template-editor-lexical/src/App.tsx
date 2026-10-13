import type { LexicalEditor } from "lexical";
import { useCallback, useMemo, useState } from "react";
import { buildCanvasHtml, Canvas } from "./Canvas";
import { compileTemplate } from "./compile";
import { applyValues, extractValues, listEditableTexts, mergeIntoDefault, SUBJECT } from "./doc";
import { SlotEditor } from "./editor/SlotEditor";
import { Toolbar, type ActiveSlot } from "./editor/Toolbar";
import { renderJinja } from "./render";
import { EMAILS } from "./templates";
import type { Doc, EmailDefinition, Node, Slot, TextSlot } from "./types";
import { validateDoc } from "./validate";

const STORAGE_KEY = "email-template-editor-lexical:v1";

type Stored = Record<string, { values: Record<string, string>; samples: Record<string, string> }>;

function load(): Stored {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function save(state: Stored) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    return;
  }
}

const defaultSamples = (doc: Doc) => Object.fromEntries(doc.variables.map((v) => [v.name, v.sample]));

type Tab = "preview" | "values" | "jinja" | "save";

export function App() {
  const [slug, setSlug] = useState(EMAILS[0].slug);
  const [stored, setStored] = useState<Stored>(load);
  const [active, setActive] = useState<ActiveSlot | null>(null);
  const [tab, setTab] = useState<Tab>("preview");
  const [resetCount, setResetCount] = useState(0);

  const email = EMAILS.find((e) => e.slug === slug)!;
  const values = stored[slug]?.values ?? extractValues(email.doc);
  const samples = stored[slug]?.samples ?? defaultSamples(email.doc);

  const update = useCallback(
    (patch: Partial<Stored[string]>) =>
      setStored((prev) => {
        const current = prev[slug] ?? { values: extractValues(email.doc), samples: defaultSamples(email.doc) };
        const next = { ...prev, [slug]: { ...current, ...patch } };
        save(next);
        return next;
      }),
    [slug, email.doc],
  );

  const onChange = useCallback(
    (address: string, value: string) =>
      setStored((prev) => {
        const current = prev[slug] ?? { values: extractValues(email.doc), samples: defaultSamples(email.doc) };
        if (current.values[address] === value) return prev;
        const next = { ...prev, [slug]: { ...current, values: { ...current.values, [address]: value } } };
        save(next);
        return next;
      }),
    [slug, email.doc],
  );

  const editables = useMemo(() => listEditableTexts(email.doc), [email.doc]);
  const labels = useMemo(() => new Map(editables.map((e) => [e.address, e.label])), [editables]);

  const onFocus = useCallback(
    (address: string, editor: LexicalEditor, format: TextSlot["format"]) =>
      setActive((prev) =>
        prev?.editor === editor ? prev : { address, editor, format, label: labels.get(address) ?? address },
      ),
    [labels],
  );

  const doc = useMemo(() => applyValues(email.doc, values), [email.doc, values]);
  const template = useMemo(() => compileTemplate(doc), [doc]);
  const errors = useMemo(() => validateDoc(doc), [doc]);
  const invalidAddresses = useMemo(() => new Set(errors.map((e) => e.address)), [errors]);
  const canvas = useMemo(() => buildCanvasHtml(email.doc, samples), [email.doc, samples]);

  const switchEmail = (next: string) => {
    setActive(null);
    setSlug(next);
  };

  const reset = () => {
    setActive(null);
    update({ values: extractValues(email.doc), samples: defaultSamples(email.doc) });
    setResetCount((n) => n + 1);
  };

  const subject = editables.find((e) => e.address === SUBJECT)!;
  const editorKey = `${slug}:${resetCount}`;

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>Email template editor</h1>
          <p className="app-sub">Lexical, one small editor per editable text. The layout around them stays locked.</p>
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
        </div>
      </header>

      <main className="layout">
        <section className="editor-col" aria-label="Editor">
          <Toolbar active={active} variables={email.doc.variables} />
          {errors.length > 0 && (
            <ul className="errors" role="alert">
              {errors.map((e, i) => (
                <li key={i}>
                  <strong>{e.label}:</strong> {e.message}
                </li>
              ))}
            </ul>
          )}
          <div className="email-card" key={editorKey}>
            <div className="subject-row">
              <span className="subject-label">Subject</span>
              <SlotEditor
                address={SUBJECT}
                slot={subject.slot}
                initialValue={values[SUBJECT] ?? subject.slot.value}
                variables={email.doc.variables}
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
                values={values}
                variables={email.doc.variables}
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
                ["values", "Slot values"],
                ["jinja", "Compiled Jinja"],
                ["save", "Save rule"],
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
                email={email}
                subject={template.subject}
                body={template.body}
                samples={samples}
                hasErrors={errors.length > 0}
                onSamples={(s) => update({ samples: s })}
              />
            )}
            {tab === "values" && <ValuesPanel values={values} labels={labels} />}
            {tab === "jinja" && <JinjaPanel subject={template.subject} body={template.body} />}
            {tab === "save" && <SavePanel email={email} submitted={doc} errors={errors.length} />}
          </div>
        </section>
      </main>
    </div>
  );
}

function Legend() {
  return (
    <ul className="legend">
      <li>
        <span className="legend-swatch editable" /> Editable text
      </li>
      <li>
        <span className="var-chip">Client first name</span> Variable, stored as <code>{"{{ client_first_name }}"}</code>
      </li>
      <li>Everything else is locked layout from the system default, rendered with sample values.</li>
      <li>
        Type <code>{"{{ firm_name }}"}</code> to get a chip. Unknown names stay as text and fail validation.
      </li>
    </ul>
  );
}

function PreviewPanel({
  email,
  subject,
  body,
  samples,
  hasErrors,
  onSamples,
}: {
  email: EmailDefinition;
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
          {email.doc.variables.map((v) => (
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

function ValuesPanel({ values, labels }: { values: Record<string, string>; labels: Map<string, string> }) {
  return (
    <>
      <p className="hint">
        What each Lexical editor exports. Rich slots store a clean HTML fragment, plain slots store text. Variables are stored as
        Jinja placeholders.
      </p>
      {Object.entries(values).map(([address, value]) => (
        <div key={address} className="value-row">
          <p className="value-label">
            {labels.get(address) ?? address} <code>{address}</code>
          </p>
          <pre>{value || "(empty)"}</pre>
        </div>
      ))}
    </>
  );
}

function JinjaPanel({ subject, body }: { subject: string; body: string }) {
  return (
    <>
      <p className="hint">
        The compiled template that gets stored next to the doc. Sending renders this as-is, so nothing is built at send time. Rich
        text gets inline styles per tag, and variables with a fallback get a <code>default()</code> filter.
      </p>
      <p className="value-label">subject</p>
      <pre>{subject}</pre>
      <p className="value-label">body</p>
      <pre className="wrap">{prettyHtml(body)}</pre>
    </>
  );
}

function SavePanel({ email, submitted, errors }: { email: EmailDefinition; submitted: Doc; errors: number }) {
  const [tampered, setTampered] = useState(false);

  const request = useMemo(() => {
    if (!tampered) return submitted;
    const t: Doc = structuredClone(submitted);
    const nodes = topNodes(t);
    const footer = nodes.find((n) => n.id === "footer");
    if (footer) footer.html = "<p>(footer removed by the client)</p>";
    const cta = nodes.find((n) => n.id === "cta");
    const label = cta?.slots.label;
    if (label?.kind === "text") label.value = "Click here!!!";
    t.body.html = t.body.html.replace("max-width:600px", "max-width:2000px");
    return t;
  }, [submitted, tampered]);

  const merged = useMemo(() => mergeIntoDefault(email.doc, request), [email.doc, request]);
  const defaultNodes = topNodes(email.doc);
  const mergedNodes = topNodes(merged);
  const same = (id: string) =>
    JSON.stringify(defaultNodes.find((n) => n.id === id)) === JSON.stringify(mergedNodes.find((n) => n.id === id));
  const textsKept = JSON.stringify(extractValues(merged)) === JSON.stringify(extractValues(request));

  const checks = [
    { ok: same("footer"), label: "Footer is the system default" },
    ...(defaultNodes.some((n) => n.id === "cta") ? [{ ok: same("cta"), label: "Button label is the system default" }] : []),
    { ok: merged.body.html === email.doc.body.html, label: "Frame HTML is the system default" },
    { ok: textsKept, label: "The user's editable texts are kept" },
    { ok: errors === 0, label: errors === 0 ? "Validation passes" : `Validation fails with ${errors} error(s), save would be rejected` },
  ];

  return (
    <>
      <p className="hint">
        The server never trusts the submitted structure. It loads the current default, copies in only the editable values, then
        validates and compiles. Try sending a request that also changes locked parts.
      </p>
      <label className="toggle">
        <input type="checkbox" checked={tampered} onChange={(e) => setTampered(e.target.checked)} />
        Tamper with the request: drop the footer, rename the button, widen the frame
      </label>
      <ul className="checks">
        {checks.map((c) => (
          <li key={c.label} className={c.ok ? "ok" : "bad"}>
            {c.ok ? "✓" : "✗"} {c.label}
          </li>
        ))}
      </ul>
      <p className="value-label">Editable values the server takes from the request</p>
      <pre>{JSON.stringify(extractValues(request), null, 2)}</pre>
    </>
  );
}

function topNodes(doc: Doc): Node[] {
  const content: Slot | undefined = doc.body.slots.content;
  return content?.kind === "nodes" ? content.nodes : [];
}

function prettyHtml(html: string): string {
  return html.replace(/(<\/(?:p|div|table|tr|ul|ol|li)>|<br \/>|<hr[^>]*>|\{% endif %\})/g, "$1\n");
}
