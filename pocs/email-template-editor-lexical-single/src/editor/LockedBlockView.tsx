import { createContext, useContext, useMemo } from "react";
import lockTagIcon from "../assets/icons/lock-tag.svg";
import { escapeHtml } from "../compile";

export const VariableLabelsContext = createContext<Map<string, string>>(new Map());

const VARIABLE = /\{\{\s*([a-z_][a-z0-9_]*)[^}]*\}\}/g;
const CONDITION = /<!--editor:condition ([\s\S]*?)-->/g;
const LOGIC = /\{%-?[\s\S]*?-?%\}/g;

export function lockedHtmlForEditor(html: string, labels: Map<string, string>): string {
  return html
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

export function LockedBlockView({ html, condition }: { html: string; condition: string | null }) {
  const labels = useContext(VariableLabelsContext);
  const markup = useMemo(() => ({ __html: lockedHtmlForEditor(html, labels) }), [html, labels]);
  return (
    <div className="blk blk-locked">
      {condition && <span className="cond-pill blk-cond">{condition}</span>}
      <div dangerouslySetInnerHTML={markup} />
      <span className="lock-tag" title="Locked">
        <img src={lockTagIcon} width={11} height={11} alt="" />
      </span>
    </div>
  );
}
