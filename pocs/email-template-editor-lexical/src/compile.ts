import DOMPurify from "dompurify";
import { prettyHtml } from "./prettyHtml";
import type { Doc, Node, Slot, TagStyles, Template, TextSlot, Variable } from "./types";

const MARKER = /\[\[\s*([a-z][a-z0-9_]*)\s*\]\]/g;
const PLACEHOLDER = /\{\{\s*([a-z][a-z0-9_]*)\s*\}\}/g;
const RICH_TAGS = ["p", "h3", "br", "strong", "em", "u", "s", "a", "ul", "ol", "li"];
const EDITOR_COMMENT = /<!--editor:[\s\S]*?-->/g;

export const escapeHtml = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

const jinjaString = (s: string) => `'${s.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;

export function sanitizeRich(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: RICH_TAGS,
    ALLOWED_ATTR: ["href"],
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:)/i,
  });
}

function applyInlineStyles(html: string, styles: TagStyles): string {
  const tpl = document.createElement("template");
  tpl.innerHTML = html;
  tpl.content.querySelectorAll("*").forEach((el) => {
    const tag = el.tagName.toLowerCase() as keyof TagStyles;
    const style = styles[tag];
    if (style) el.setAttribute("style", style);
    if (tag === "a") {
      el.setAttribute("target", "_blank");
      el.setAttribute("rel", "noopener noreferrer");
    }
  });
  return tpl.innerHTML;
}

function withFallbacks(text: string, variables: Variable[]): string {
  const byName = new Map(variables.map((v) => [v.name, v]));
  return text.replace(PLACEHOLDER, (whole, name: string) => {
    const v = byName.get(name);
    return v?.fallback !== undefined ? `{{ ${name} | default(${jinjaString(v.fallback)}, true) }}` : whole;
  });
}

export function isBlankText(slot: TextSlot): boolean {
  if (slot.format === "plain") return slot.value.trim() === "";
  const tpl = document.createElement("template");
  tpl.innerHTML = slot.value;
  return (tpl.content.textContent ?? "").trim() === "";
}

export function compileText(slot: TextSlot, doc: Doc): string {
  if (slot.format === "plain") return withFallbacks(escapeHtml(slot.value), doc.variables);
  const clean = sanitizeRich(slot.value);
  const styled = applyInlineStyles(clean, { ...doc.textStyles, ...slot.styles });
  return withFallbacks(styled, doc.variables);
}

function hasOnlyBlankOptionalTexts(node: Node): boolean {
  const texts = Object.values(node.slots).filter((s): s is TextSlot => s.kind === "text" && s.editable);
  return texts.length > 0 && texts.every((s) => s.required === false && isBlankText(s));
}

export function compileNode(node: Node, doc: Doc): string {
  if (hasOnlyBlankOptionalTexts(node)) return "";
  return node.html.replace(MARKER, (_, name: string) => {
    const slot: Slot | undefined = node.slots[name];
    if (!slot) throw new Error(`Node "${node.id}" has a [[${name}]] marker but no slot for it`);
    if (slot.kind === "text") return compileText(slot, doc);
    if (slot.kind === "node") return compileNode(slot.node, doc);
    return slot.nodes.map((n) => compileNode(n, doc)).join("");
  });
}

export function compileTemplate(doc: Doc): Template {
  return {
    schemaVersion: 2,
    subject: compileText(doc.subject, doc),
    body: prettyHtml(compileNode(doc.body, doc).replace(EDITOR_COMMENT, "")),
    doc,
  };
}
