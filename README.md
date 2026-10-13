# PoC sandbox

Small proofs of concept, published with GitHub Pages at <https://magab89.github.io>.

Everything here is public once Pages is on. Use sample data only.

## Layout

```
site/           landing page; the PoC list is generated into it at build time
pocs/<slug>/    one folder per PoC, served at /pocs/<slug>/
  poc.json      title, description, date, tags for the landing page
scripts/build-site.mjs   builds every PoC and assembles _site/
.github/workflows/pages.yml   builds and deploys on every push to master
```

A PoC folder is either:

- a plain static folder (an `index.html` plus assets), copied as-is, or
- an npm workspace package with a `build` script that writes to `dist/`. Use relative asset paths, for example Vite's `base: "./"`.

## Add a PoC

1. Create `pocs/<slug>/` with a `poc.json`.
2. For a built PoC, add a `package.json` and run `npm install` at the repo root.
3. Push to master. The workflow builds and deploys it.

## Run locally

```bash
npm install
npm run dev -w pocs/email-template-editor-lexical
```

Build and serve the whole site the way Pages will:

```bash
npm run build && npm run preview
```
