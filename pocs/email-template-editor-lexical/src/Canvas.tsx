import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { compileText } from "./compile";
import { SlotEditor, type SlotEditorProps } from "./editor/SlotEditor";
import { renderJinja } from "./render";
import type { Doc, EditableText, Node } from "./types";

const MARKER = /\[\[\s*([a-z][a-z0-9_]*)\s*\]\]/g;

function canvasNode(node: Node, doc: Doc): string {
  return node.html.replace(MARKER, (_, name: string) => {
    const slot = node.slots[name];
    if (slot.kind === "text") {
      if (!slot.editable) return compileText(slot, doc);
      const tag = slot.format === "rich" ? "div" : "span";
      return `<${tag} class="slot-mount slot-mount-${slot.format}" data-slot="${node.id}.${name}"></${tag}>`;
    }
    if (slot.kind === "node") return canvasNode(slot.node, doc);
    return slot.nodes.map((n) => canvasNode(n, doc)).join("");
  });
}

export function buildCanvasHtml(doc: Doc, samples: Record<string, string>): { html: string; error?: string } {
  return renderJinja(canvasNode(doc.body, doc), samples);
}

type Props = Omit<SlotEditorProps, "address" | "slot" | "invalid"> & {
  html: string;
  editables: EditableText[];
  invalidAddresses: Set<string>;
};

export function Canvas({ html, editables, invalidAddresses, ...editorProps }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [mounts, setMounts] = useState<Record<string, HTMLElement> | null>(null);
  const markup = useMemo(() => ({ __html: html }), [html]);

  useLayoutEffect(() => {
    const found: Record<string, HTMLElement> = {};
    ref.current?.querySelectorAll<HTMLElement>("[data-slot]").forEach((el) => {
      found[el.dataset.slot!] = el;
    });
    setMounts(found);
  }, [html]);

  const editor = (e: EditableText) => (
    <SlotEditor
      key={e.address}
      address={e.address}
      slot={e.slot}
      invalid={invalidAddresses.has(e.address)}
      {...editorProps}
    />
  );

  const hidden = mounts ? editables.filter((e) => !mounts[e.address]) : [];

  return (
    <>
      <div ref={ref} className="email-canvas" dangerouslySetInnerHTML={markup} />
      {mounts && editables.filter((e) => mounts[e.address]).map((e) => createPortal(editor(e), mounts[e.address], e.address))}
      {hidden.length > 0 && (
        <div className="hidden-slots">
          <p className="hidden-slots-title">Not shown with the current sample values</p>
          {hidden.map((e) => (
            <div key={e.address} className="hidden-slot">
              <p className="hidden-slot-label">
                {e.label}
                {e.description ? <span> · {e.description}</span> : null}
              </p>
              {editor(e)}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
