import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import lockTagIcon from "./assets/icons/lock-tag.svg";
import { compileText, escapeHtml } from "./compile";
import { SlotEditor, type SlotEditorProps } from "./editor/SlotEditor";
import type { Doc, EditableText, Node } from "./types";

const MARKER = /\[\[\s*([a-z][a-z0-9_]*)\s*\]\]/g;
const VARIABLE = /\{\{\s*([a-z_][a-z0-9_]*)[^}]*\}\}/g;
const CONDITION = /<!--editor:condition ([\s\S]*?)-->/g;
const LOGIC = /\{%-?[\s\S]*?-?%\}/g;

function canvasNode(node: Node, doc: Doc, topLevel = false): string {
  return node.html.replace(MARKER, (_, name: string) => {
    const slot = node.slots[name];
    if (slot.kind === "text") {
      if (!slot.editable) return compileText(slot, doc);
      const tag = slot.format === "rich" ? "div" : "span";
      return `<${tag} class="slot-mount slot-mount-${slot.format}" data-slot="${node.id}.${name}"></${tag}>`;
    }
    if (slot.kind === "node") return canvasNode(slot.node, doc);
    return slot.nodes
      .map((child) => {
        const inner = canvasNode(child, doc);
        if (!topLevel) return inner;
        const locked = !JSON.stringify(child.slots).includes('"editable":true');
        return locked
          ? `<div class="blk blk-locked">${inner}<span class="lock-tag" title="Locked"><img src="${lockTagIcon}" width="11" height="11" alt="" /></span></div>`
          : `<div class="blk">${inner}</div>`;
      })
      .join("");
  });
}

export function buildCanvasHtml(doc: Doc): string {
  const labels = new Map(doc.variables.map((v) => [v.name, v.label]));
  return canvasNode(doc.body, doc, true)
    .replace(CONDITION, (_, text: string) => `<span class="cond-pill">${escapeHtml(text)}</span>`)
    .replace(LOGIC, "")
    .split(/(<[^>]*>)/)
    .map((part) =>
      part.startsWith("<")
        ? part.replace(VARIABLE, "#")
        : part.replace(VARIABLE, (_, name: string) => `<span class="ph-chip">${escapeHtml(labels.get(name) ?? name)}</span>`),
    )
    .join("");
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

  return (
    <>
      <div ref={ref} className="email-body" dangerouslySetInnerHTML={markup} />
      {mounts &&
        editables
          .filter((e) => mounts[e.address])
          .map((e) =>
            createPortal(
              <SlotEditor
                key={e.address}
                address={e.address}
                slot={e.slot}
                label={e.label}
                invalid={invalidAddresses.has(e.address)}
                {...editorProps}
              />,
              mounts[e.address],
              e.address,
            ),
          )}
    </>
  );
}
