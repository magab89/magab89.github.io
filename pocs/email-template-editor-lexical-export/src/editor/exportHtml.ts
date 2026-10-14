import { createHeadlessEditor } from "@lexical/headless";
import { $generateHtmlFromNodes } from "@lexical/html";
import { LinkNode } from "@lexical/link";
import { ListItemNode, ListNode } from "@lexical/list";
import { HeadingNode } from "@lexical/rich-text";
import {
  $isElementNode,
  ParagraphNode,
  TextNode,
  type DOMExportOutput,
  type DOMExportOutputMap,
  type Klass,
  type LexicalEditor,
  type LexicalNode,
  type TextFormatType,
} from "lexical";
import type { LexicalJson } from "../lexicalJson";
import type { TagStyles } from "../types";
import {
  $findSlot,
  $getEmailNode,
  $getSlots,
  CONTENT_MARKER,
  EmailNode,
  GroupNode,
  LockedBlockNode,
  SlotNode,
  type SlotAttrs,
} from "./emailNodes";
import { EMAIL_NODES } from "./emailRules";
import { VariableNode } from "./VariableNode";

const MARKER_ATTR = "data-lexical-content";

function fragmentFromHtml(html: string): DocumentFragment {
  const template = document.createElement("template");
  template.innerHTML = html;
  return document.importNode(template.content, true);
}

function fillWrapper(wrapper: string, content: Node[]): DocumentFragment {
  const fragment = fragmentFromHtml(wrapper.replace(CONTENT_MARKER, `<span ${MARKER_ATTR}></span>`));
  fragment.querySelector(`[${MARKER_ATTR}]`)?.replaceWith(...content);
  return fragment;
}

const styles = (): TagStyles => $getEmailNode()?.getTextStyles() ?? {};

function styled(tag: string, style: string | undefined): HTMLElement {
  const element = document.createElement(tag);
  if (style) element.setAttribute("style", style);
  return element;
}

const FORMAT_TAGS: [TextFormatType, string][] = [
  ["bold", "strong"],
  ["italic", "em"],
  ["underline", "u"],
  ["strikethrough", "s"],
];

function formatted(node: TextNode, text: string): DOMExportOutput {
  let output: HTMLElement | Text = document.createTextNode(text);
  for (const [format, tag] of [...FORMAT_TAGS].reverse()) {
    if (!node.hasFormat(format)) continue;
    const wrapper = document.createElement(tag);
    wrapper.append(output);
    output = wrapper;
  }
  return { element: output };
}

function $isEmptySlot(slot: SlotNode): boolean {
  return slot.getTextContent().trim() === "" && !slot.getAllTextNodes().some((n) => n instanceof VariableNode);
}

function $plainText(slot: SlotNode): string {
  return slot
    .getAllTextNodes()
    .map((n) => (n instanceof VariableNode ? `{{ ${n.getVariable()} }}` : n.getTextContent()))
    .join("");
}

export function $subjectText(): string {
  const subject = $getSlots().find((s) => s.getAttrs().slotId === "subject");
  return subject ? $plainText(subject) : "";
}

function $isTrailingEmpty(node: LexicalNode): boolean {
  if (node.getTextContent().trim() !== "") return false;
  let next = node.getNextSibling();
  while (next) {
    if (next.getTextContent().trim() !== "") return false;
    next = next.getNextSibling();
  }
  return node.getPreviousSibling() !== null;
}

type Exporter = (editor: LexicalEditor, node: LexicalNode) => DOMExportOutput;

export const EMAIL_EXPORT: DOMExportOutputMap = new Map<Klass<LexicalNode>, Exporter>([
  [
    EmailNode,
    (_editor, node) => {
      const email = node as EmailNode;
      const parsed = new DOMParser().parseFromString(email.getFrame().replace(CONTENT_MARKER, `<span ${MARKER_ATTR}></span>`), "text/html");
      const html = document.importNode(parsed.documentElement, true);
      const own = new Set(html.childNodes);
      return {
        element: html,
        after: (generated) => {
          if (!(generated instanceof HTMLElement)) return undefined;
          const children = [...generated.childNodes].filter((c) => !own.has(c));
          generated.querySelector(`[${MARKER_ATTR}]`)?.replaceWith(...children);
          const title = generated.querySelector("title");
          if (title?.textContent?.includes("[[subject]]")) title.textContent = title.textContent.replace("[[subject]]", $subjectText());
          return undefined;
        },
      };
    },
  ],
  [
    SlotNode,
    (_editor, node) => {
      const slot = node as SlotNode;
      const a: SlotAttrs = slot.getAttrs();
      if (a.slotId === "subject") return { element: null };
      if (a.dropIfEmpty && !a.required && $isEmptySlot(slot)) return { element: null };
      return {
        element: document.createElement("span"),
        after: (generated) => {
          if (!(generated instanceof HTMLElement)) return undefined;
          const content: Node[] = [...generated.childNodes];
          if (a.prefix) content.unshift(document.createTextNode(a.prefix));
          if (a.suffix) content.push(document.createTextNode(a.suffix));
          if (a.wrapper) return fillWrapper(a.wrapper, content);
          const fragment = document.createDocumentFragment();
          fragment.append(...content);
          return fragment;
        },
      };
    },
  ],
  [
    GroupNode,
    (_editor, node) => ({
      element: document.createElement("span"),
      after: (generated) => (generated instanceof HTMLElement ? fillWrapper((node as GroupNode).getWrapper(), [...generated.childNodes]) : undefined),
    }),
  ],
  [LockedBlockNode, (_editor, node) => ({ element: fragmentFromHtml((node as LockedBlockNode).getHtml()) })],
  [
    ParagraphNode,
    (_editor, node) => {
      const slot = $findSlot(node);
      if (!slot || slot.getAttrs().slotFormat === "plain") return { element: document.createDocumentFragment() };
      if ($isTrailingEmpty(node)) return { element: null };
      const p = styled("p", slot.getAttrs().blockStyle);
      if ($isElementNode(node) && node.getChildrenSize() === 0) p.append(document.createElement("br"));
      return { element: p };
    },
  ],
  [HeadingNode, () => ({ element: styled("h3", styles().h3) })],
  [
    ListNode,
    (_editor, node) => ({
      element: styled((node as ListNode).getListType() === "number" ? "ol" : "ul", styles()[(node as ListNode).getListType() === "number" ? "ol" : "ul"]),
      after: (generated) => {
        if (!(generated instanceof HTMLElement)) return undefined;
        for (const li of [...generated.children]) {
          const onlyList = li.children.length > 0 && [...li.childNodes].every((c) => c instanceof HTMLElement && /^(UL|OL)$/.test(c.tagName));
          const previous = li.previousElementSibling;
          if (onlyList && previous) {
            previous.append(...li.childNodes);
            li.remove();
          }
        }
        return undefined;
      },
    }),
  ],
  [ListItemNode, () => ({ element: styled("li", styles().li) })],
  [
    LinkNode,
    (_editor, node) => {
      const a = styled("a", styles().a);
      a.setAttribute("href", (node as LinkNode).getURL());
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener noreferrer");
      return { element: a };
    },
  ],
  [TextNode, (_editor, node) => formatted(node as TextNode, (node as TextNode).getTextContent())],
  [VariableNode, (_editor, node) => formatted(node as VariableNode, `{{ ${(node as VariableNode).getVariable()} }}`)],
]);

export function compileWithLexical(state: LexicalJson): { subject: string; body: string } {
  const editor = createHeadlessEditor({
    namespace: "email-export",
    nodes: EMAIL_NODES,
    html: { export: EMAIL_EXPORT },
    onError: (e) => {
      throw e;
    },
  });
  editor.setEditorState(editor.parseEditorState(JSON.stringify(state)));
  return editor.read(() => ({ subject: $subjectText(), body: $generateHtmlFromNodes(editor, null) }));
}
