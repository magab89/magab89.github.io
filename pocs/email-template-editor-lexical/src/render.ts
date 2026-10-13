import nunjucks from "nunjucks";

const env = new nunjucks.Environment(null, { autoescape: true, throwOnUndefined: true });

export function renderJinja(source: string, samples: Record<string, string>): { html: string; error?: string } {
  try {
    return { html: env.renderString(source, samples) };
  } catch (e) {
    return { html: "", error: e instanceof Error ? e.message : String(e) };
  }
}
