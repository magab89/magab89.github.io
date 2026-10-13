import type { TextSlot } from "./types";

export type LexNode = { type: string; children?: LexNode[]; [key: string]: unknown };
export type LexicalJson = { root: LexNode };

const BOLD = 1;
const ITALIC = 2;
const STRIKETHROUGH = 4;
const UNDERLINE = 8;
const ALLOWED_FORMAT_BITS = BOLD | ITALIC | STRIKETHROUGH | UNDERLINE;
const SAFE_URL = /^(https?:|mailto:)/i;

const ALLOWED_TYPES: Record<TextSlot["format"], Set<string>> = {
  plain: new Set(["root", "paragraph", "text", "variable"]),
  rich: new Set(["root", "paragraph", "heading", "text", "variable", "linebreak", "list", "listitem", "link"]),
};

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

function wrap(format: number, inner: string): string {
  let out = inner;
  if (format & STRIKETHROUGH) out = `<s>${out}</s>`;
  if (format & UNDERLINE) out = `<u>${out}</u>`;
  if (format & ITALIC) out = `<em>${out}</em>`;
  if (format & BOLD) out = `<strong>${out}</strong>`;
  return out;
}

function richNode(n: LexNode): string {
  const inner = () => (n.children ?? []).map(richNode).join("");
  switch (n.type) {
    case "root":
      return inner();
    case "paragraph":
      return `<p>${inner() || "<br>"}</p>`;
    case "heading":
      return `<h3>${inner() || "<br>"}</h3>`;
    case "text":
      return wrap(Number(n.format) || 0, esc(String(n.text ?? "")));
    case "variable":
      return wrap(Number(n.format) || 0, `{{ ${String(n.variable)} }}`);
    case "linebreak":
      return "<br>";
    case "list": {
      const tag = n.listType === "number" ? "ol" : "ul";
      const items: string[] = [];
      for (const item of n.children ?? []) {
        const html = richNode(item);
        const nestedOnly = (item.children ?? []).length > 0 && (item.children ?? []).every((c) => c.type === "list");
        if (nestedOnly && items.length) items[items.length - 1] = items[items.length - 1].replace(/<\/li>$/, `${html.slice(4, -5)}</li>`);
        else items.push(html);
      }
      return `<${tag}>${items.join("")}</${tag}>`;
    }
    case "listitem":
      return `<li>${inner()}</li>`;
    case "link":
      return `<a href="${esc(String(n.url ?? ""))}">${inner()}</a>`;
    default:
      return "";
  }
}

function collect(n: LexNode, out: LexNode[] = []): LexNode[] {
  out.push(n);
  (n.children ?? []).forEach((c) => collect(c, out));
  return out;
}

export function lexicalJsonToHtml(json: LexicalJson, format: TextSlot["format"]): string {
  const nodes = collect(json.root);
  if (format === "plain") {
    return nodes
      .map((n) => (n.type === "text" ? String(n.text ?? "") : n.type === "variable" ? `{{ ${String(n.variable)} }}` : ""))
      .join("");
  }
  const blank = !nodes.some((n) => n.type === "variable" || (n.type === "text" && String(n.text ?? "").trim() !== ""));
  return blank ? "" : richNode(json.root);
}

export function validateLexicalJson(json: unknown, format: TextSlot["format"], insertable: Set<string>): string[] {
  const errors: string[] = [];
  const root = (json as LexicalJson | undefined)?.root;
  if (!root || root.type !== "root" || !Array.isArray(root.children)) return ["Content isn't a Lexical document."];

  const allowed = ALLOWED_TYPES[format];
  if (format === "plain" && (root.children.length !== 1 || root.children[0].type !== "paragraph")) {
    errors.push("A one-line text must be exactly one paragraph.");
  }
  for (const child of root.children) {
    if (child.type !== "paragraph" && child.type !== "list" && child.type !== "heading") errors.push(`"${child.type}" can't sit at the top level.`);
  }
  for (const n of collect(root)) {
    if (!allowed.has(n.type)) {
      errors.push(`Node type "${n.type}" isn't allowed here.`);
      continue;
    }
    if (n.type === "text" || n.type === "variable") {
      const bits = Number(n.format) || 0;
      if (format === "plain" ? bits !== 0 : (bits & ~ALLOWED_FORMAT_BITS) !== 0) errors.push("Text formatting that isn't allowed.");
      if (n.style) errors.push("Inline styles aren't allowed.");
    }
    if (n.type === "variable" && !insertable.has(String(n.variable))) errors.push(`{{ ${String(n.variable)} }} isn't available in this email.`);
    if (n.type === "link" && !SAFE_URL.test(String(n.url ?? ""))) errors.push(`Link "${String(n.url)}" must start with http, https or mailto.`);
    if (n.type === "heading" && n.tag !== "h3") errors.push(`Heading level "${String(n.tag)}" isn't allowed.`);
    if (n.type === "list" && n.listType !== "bullet" && n.listType !== "number") errors.push(`List type "${String(n.listType)}" isn't allowed.`);
  }
  return [...new Set(errors)];
}
