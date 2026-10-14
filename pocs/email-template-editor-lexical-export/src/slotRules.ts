import type { LexNode } from "./lexicalJson";
import type { SlotFormat, TagStyles } from "./types";

const FONT = "font-family:Arial, Helvetica, sans-serif;";

export const TEXT_STYLES: TagStyles = {
  h3: `margin:0 0 8px 0; font-size:16px; font-weight:bold; ${FONT} color:#212529; line-height:1.5;`,
  ul: `margin:0 0 16px 0; padding-left:20px; font-size:14px; ${FONT} color:#212529; line-height:1.5;`,
  ol: `margin:0 0 16px 0; padding-left:20px; font-size:14px; ${FONT} color:#212529; line-height:1.5;`,
  li: "margin:0 0 4px 0;",
  a: "color:#5227CC; font-weight:500; text-decoration:underline;",
};

export type SlotSettings = { slotId: string; slotFormat: SlotFormat; wrapper: string };

const LABELS: Record<string, string> = { button_text: "Button text" };
const REQUIRED = new Set(["subject", "greeting", "message"]);

export const isButton = (wrapper: string) => /<a\s/i.test(wrapper);

export function slotLabel(slotId: string): string {
  const conditional = slotId.match(/^(.*)_conditional_sentence$/);
  if (conditional) return `${slotLabel(conditional[1])}, conditional sentence`;
  const base = slotId.replace(/_\d+$/, "");
  return LABELS[base] ?? base.charAt(0).toUpperCase() + base.slice(1).replace(/_/g, " ");
}

export const slotRequired = (s: SlotSettings) => REQUIRED.has(s.slotId) || isButton(s.wrapper);

export const slotMaxLength = (s: SlotSettings) => (s.slotFormat === "rich" ? 5000 : isButton(s.wrapper) ? 60 : 200);

export function slotPlaceholder(s: SlotSettings): string {
  const text = `Add a ${slotLabel(s.slotId).toLowerCase()}`;
  return slotRequired(s) ? text : `${text} (optional)`;
}

export const isAdvisorEmail = (variableNames: string[]) => variableNames.includes("notification_settings_link");

export function conditionLabel(variable: string | null, advisorEmail: boolean): string | null {
  if (!variable) return null;
  const labels: Record<string, string> = {
    decline_message: "Only if the advisor adds a note",
    cancellation_reason: advisorEmail ? "Only if the client gives a reason" : "Only if the advisor adds a note",
    client_message: "Only if the client adds a note",
    reschedule_message: "Only if the client adds a rescheduling note",
    request_type: "Only for reschedule requests with a note",
    event_type_booking_link: "Only if the client can book again",
    intake_answers: "Only if the client answered intake questions",
    notification_settings_link: "Only if notification settings apply",
  };
  return labels[variable] ?? `Only if ${variable.replace(/_/g, " ")} is set`;
}

const IF_VAR = /\{%-?\s*if\s+([a-z_][a-z0-9_]*)/;

export const wrapperCondition = (wrapper: string) => wrapper.match(IF_VAR)?.[1] ?? null;

const startVariable = (html: string) => html.trim().match(/^<!--\{%-?\s*if\s+([a-z_][a-z0-9_]*)/)?.[1] ?? null;

export function leadingCondition(html: string): string | null {
  const variable = startVariable(html);
  if (!variable || !/<!--\{%-?\s*endif\s*-?%\}-->$/.test(html.trim())) return null;
  const tags = [...html.matchAll(/\{%-?\s*(if|endif)\b/g)];
  let depth = 0;
  for (let i = 0; i < tags.length; i++) {
    depth += tags[i][1] === "if" ? 1 : -1;
    if (depth === 0 && i < tags.length - 1) return null;
  }
  return variable;
}

const isConditionStart = (html: string) => /^<!--\{%-?\s*if\s[^%]*%\}-->$/.test(html.trim());
const isConditionEnd = (html: string) => /^<!--\{%-?\s*endif\s*-?%\}-->$/.test(html.trim());

export type BlockInfo = { kind: "slot"; wrapper: string } | { kind: "locked"; html: string } | { kind: "group"; slots: { wrapper: string }[] };

export function blockConditions(blocks: BlockInfo[], variableNames: string[]): (string | null)[] {
  const advisor = isAdvisorEmail(variableNames);
  const open: string[] = [];
  const out: (string | null)[] = [];
  const region = () => open[open.length - 1] ?? null;
  for (const block of blocks) {
    if (block.kind === "group") {
      block.slots.forEach((s) => out.push(conditionLabel(wrapperCondition(s.wrapper) ?? region(), advisor)));
      continue;
    }
    if (block.kind === "slot") {
      out.push(conditionLabel(wrapperCondition(block.wrapper) ?? region(), advisor));
      continue;
    }
    if (isConditionStart(block.html)) {
      open.push(startVariable(block.html) ?? "");
      out.push(null);
    } else if (isConditionEnd(block.html)) {
      open.pop();
      out.push(null);
    } else {
      out.push(conditionLabel(leadingCondition(block.html) ?? region(), advisor));
    }
  }
  return out;
}

export function contentSignature(nodes: LexNode[]): unknown {
  return nodes.map((n) => {
    if (n.type === "variable") return ["variable", n.variable, n.format ?? 0];
    if (n.type === "text") return ["text", n.text, n.format ?? 0];
    return [n.type, n.tag ?? n.listType ?? n.url ?? null, contentSignature(n.children ?? [])];
  });
}
