import { isBlankText } from "./compile";
import { listEditableTexts } from "./doc";
import { validateLexicalJson } from "./lexicalJson";
import type { Doc } from "./types";

export type ValidationError = { address: string; label: string; message: string };

const PLACEHOLDER = /\{\{\s*([a-z][a-z0-9_]*)\s*\}\}/g;

export function validateDoc(doc: Doc): ValidationError[] {
  const errors: ValidationError[] = [];
  const insertable = new Set(doc.variables.filter((v) => v.insertable).map((v) => v.name));

  for (const { address, label, slot } of listEditableTexts(doc)) {
    const push = (message: string) => {
      if (!errors.some((e) => e.address === address && e.message === message)) errors.push({ address, label, message });
    };
    if (slot.content) validateLexicalJson(slot.content, slot.format, insertable).forEach(push);
    const plainText = slot.format === "rich" ? textOf(slot.value) : slot.value;

    if (slot.required !== false && isBlankText(slot)) push("Can't be empty.");
    if (slot.maxLength && plainText.length > slot.maxLength) push(`Longer than ${slot.maxLength} characters.`);

    if (!slot.content) {
      for (const [, name] of plainText.matchAll(PLACEHOLDER)) {
        if (!insertable.has(name)) push(`Unknown variable {{ ${name} }}.`);
      }
    }
    const leftover = plainText.replace(PLACEHOLDER, "");
    if (/\{%|\{#|\{\{|\}\}/.test(leftover)) push("Template logic ({% %}, {# #} or a stray {{ }}) isn't allowed.");

    if (slot.format === "rich") {
      const tpl = document.createElement("template");
      tpl.innerHTML = slot.value;
      tpl.content.querySelectorAll("[href]").forEach((a) => {
        const href = a.getAttribute("href") ?? "";
        if (/\{\{|\{%/.test(href)) push("Variables can't be used inside a link address.");
        else if (!/^(https?:|mailto:)/i.test(href)) push(`Link "${href}" must start with http, https or mailto.`);
      });
    }
  }
  return errors;
}

function textOf(html: string): string {
  const tpl = document.createElement("template");
  tpl.innerHTML = html;
  return tpl.content.textContent ?? "";
}
