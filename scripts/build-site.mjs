import { execSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const out = join(root, "_site");
const pocsDir = join(root, "pocs");

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(join(root, "site"), out, { recursive: true });

const escape = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

const pocs = [];
for (const slug of readdirSync(pocsDir).sort()) {
  const dir = join(pocsDir, slug);
  const metaPath = join(dir, "poc.json");
  if (!existsSync(metaPath)) continue;
  const meta = JSON.parse(readFileSync(metaPath, "utf8"));
  const target = join(out, "pocs", slug);
  const pkgPath = join(dir, "package.json");

  if (existsSync(pkgPath) && JSON.parse(readFileSync(pkgPath, "utf8")).scripts?.build) {
    console.log(`building ${slug}`);
    execSync(`npm run build -w pocs/${slug}`, { cwd: root, stdio: "inherit" });
    cpSync(join(dir, "dist"), target, { recursive: true });
  } else {
    cpSync(dir, target, { recursive: true, filter: (p) => !p.endsWith("poc.json") });
  }
  pocs.push({ slug, ...meta });
}

pocs.sort((a, b) => String(b.date).localeCompare(String(a.date)));

const list = pocs
  .map(
    (p) => `<li class="poc">
        <a href="pocs/${escape(p.slug)}/">
          <span class="poc-title">${escape(p.title)}</span>
          <span class="poc-desc">${escape(p.description)}</span>
          <span class="poc-meta">${escape(p.date)}${(p.tags ?? []).map((t) => ` · ${escape(t)}`).join("")}</span>
        </a>
      </li>`,
  )
  .join("\n      ");

const indexPath = join(out, "index.html");
writeFileSync(indexPath, readFileSync(indexPath, "utf8").replace("<!--POC_LIST-->", list || "<li>No PoCs yet.</li>"));
writeFileSync(join(out, ".nojekyll"), "");
console.log(`site built: ${pocs.length} PoC(s) in _site/`);
