const BLOCK = new Set([
  "html", "head", "body", "title", "meta", "style", "table", "thead", "tbody", "tfoot", "tr", "td", "th",
  "div", "p", "ul", "ol", "li", "hr", "h1", "h2", "h3", "h4", "h5", "h6", "center",
]);
const VOID = new Set(["br", "hr", "img", "meta", "input", "link"]);
const TOKEN = /(<!--[\s\S]*?-->|<\/?[a-zA-Z][^>]*>|\{%-?[\s\S]*?-?%\})/;

type Tree =
  | { kind: "inline"; text: string }
  | { kind: "block"; name: string; open: string; close: string | null; children: Tree[] };

const tagName = (tag: string) => tag.match(/^<\/?([a-zA-Z0-9]+)/)?.[1].toLowerCase() ?? "";
const jinjaWord = (tag: string) => tag.match(/^\{%-?\s*(\w+)/)?.[1] ?? "";
const JINJA_OPEN = new Set(["if", "for", "block", "macro", "with"]);
const JINJA_MID = new Set(["else", "elif"]);

function parse(html: string): Tree[] {
  const root: Tree = { kind: "block", name: "#root", open: "", close: null, children: [] };
  const stack: Extract<Tree, { kind: "block" }>[] = [root];
  const top = () => stack[stack.length - 1];
  const addInline = (text: string) => {
    const kids = top().children;
    const last = kids[kids.length - 1];
    if (last?.kind === "inline") last.text += text;
    else kids.push({ kind: "inline", text });
  };

  for (const token of html.split(TOKEN)) {
    if (!token) continue;
    if (token.startsWith("{%")) {
      const word = jinjaWord(token);
      if (JINJA_OPEN.has(word)) {
        const node = { kind: "block" as const, name: `%${word}`, open: token, close: null, children: [] };
        top().children.push(node);
        stack.push(node);
      } else if (word.startsWith("end")) {
        const idx = stack.map((n) => n.name).lastIndexOf(`%${word.slice(3)}`);
        if (idx > 0) {
          stack[idx].close = token;
          stack.length = idx;
        } else addInline(token);
      } else if (JINJA_MID.has(word)) {
        top().children.push({ kind: "block", name: "%mid", open: token, close: null, children: [] });
      } else addInline(token);
      continue;
    }
    if (token.startsWith("<") && !token.startsWith("<!--")) {
      const name = tagName(token);
      if (!BLOCK.has(name)) {
        addInline(token);
        continue;
      }
      if (token.startsWith("</")) {
        const idx = stack.map((n) => n.name).lastIndexOf(name);
        if (idx > 0) {
          stack[idx].close = token;
          stack.length = idx;
        }
        continue;
      }
      const node = { kind: "block" as const, name, open: token, close: null, children: [] };
      top().children.push(node);
      if (!VOID.has(name) && !token.endsWith("/>")) stack.push(node);
      continue;
    }
    addInline(token.replace(/\s+/g, " "));
  }
  return root.children;
}

function flat(node: Tree): string | null {
  if (node.kind === "inline") return node.text;
  if (!node.name.startsWith("%") || node.name === "%mid" || node.close === null) return null;
  let text = node.open;
  for (const child of node.children) {
    const f = flat(child);
    if (f === null) return null;
    text += f;
  }
  return text + node.close;
}

function print(nodes: Tree[], depth: number, out: string[]) {
  const pad = "  ".repeat(depth);
  let buffer = "";
  const flush = () => {
    if (buffer.trim()) out.push(pad + buffer.trim());
    buffer = "";
  };
  for (const node of nodes) {
    const f = flat(node);
    if (f !== null) {
      buffer += f;
      continue;
    }
    flush();
    if (node.kind === "inline") continue;
    if (node.name === "%mid") {
      out.push("  ".repeat(Math.max(0, depth - 1)) + node.open);
      continue;
    }
    const flatChildren = node.children.map(flat);
    if (flatChildren.every((c) => c !== null) && (node.close !== null || flatChildren.join("").trim() === "")) {
      out.push(pad + node.open + flatChildren.join("").trim() + (node.close ?? ""));
      continue;
    }
    out.push(pad + node.open);
    print(node.children, depth + 1, out);
    if (node.close) out.push(pad + node.close);
  }
  flush();
}

export function prettyHtml(html: string): string {
  const out: string[] = [];
  print(parse(html), 0, out);
  return out.join("\n");
}

const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
const HL_TOKEN = /(\{\{[\s\S]*?\}\}|\{%-?[\s\S]*?-?%\}|<!--[\s\S]*?-->|<\/?[a-zA-Z][^>]*>)/;

function highlightTag(tag: string): string {
  const m = tag.match(/^(<\/?)([a-zA-Z0-9]+)([\s\S]*?)(\/?>)$/);
  if (!m) return esc(tag);
  const attrs = m[3].replace(
    /([a-zA-Z-:]+)(=)("[^"]*"|'[^']*')?/g,
    (_, name: string, eq: string, value = "") =>
      `<span class="hl-attr">${esc(name)}</span>${eq}<span class="hl-str">${highlightJinjaIn(value)}</span>`,
  );
  return `<span class="hl-tag">${esc(m[1])}${esc(m[2])}</span>${attrs}<span class="hl-tag">${esc(m[4])}</span>`;
}

function highlightJinjaIn(s: string): string {
  return s
    .split(/(\{\{[\s\S]*?\}\})/)
    .map((part) => (part.startsWith("{{") ? `<span class="hl-jinja">${esc(part)}</span>` : esc(part)))
    .join("");
}

export function highlightHtml(code: string): string {
  return code
    .split(HL_TOKEN)
    .map((part) => {
      if (!part) return "";
      if (part.startsWith("{{") || part.startsWith("{%")) return `<span class="hl-jinja">${esc(part)}</span>`;
      if (part.startsWith("<!--")) return `<span class="hl-comment">${esc(part)}</span>`;
      if (part.startsWith("<")) return highlightTag(part);
      return esc(part);
    })
    .join("");
}
