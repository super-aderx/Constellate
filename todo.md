# To do

## Deploy the landing page to GitHub Pages [CSA-6]

The landing page (`frontend/constella-frontend/`) is fully static: it uses sample data from `content.ts`, calls no API, has no client-side router (only `#hash` anchors), and bundles its fonts. GitHub Pages can host it with no backend.

Target URL: `https://super-aderx.github.io/Constellate/` (served under the `/Constellate/` sub-path).

### Steps
- [ ] **Repo setting (manual, one-time):** Settings → Pages → Source: **GitHub Actions**.
- [ ] **`frontend/constella-frontend/vite.config.ts`:** set `base` only for production builds, so `npm run dev` still serves from `/`:
  ```ts
  export default defineConfig(({ command }) => ({
    base: command === 'build' ? '/Constellate/' : '/',
    // ...existing plugins and resolve
  }))
  ```
  Vite rewrites `/favicon.svg` in `index.html` automatically; nothing in `src/` uses root-absolute paths.
- [ ] **`.github/workflows/deploy-pages.yml`:**
  - Triggers: push to `main` (paths `frontend/constella-frontend/**` and the workflow file) and `workflow_dispatch`.
  - Permissions `contents: read`, `pages: write`, `id-token: write`; concurrency group `pages`.
  - `build` job (`working-directory: frontend/constella-frontend`): `actions/checkout` → `actions/setup-node` (Node 22, npm cache on `frontend/constella-frontend/package-lock.json`) → `npm ci` → `npm run build` → `actions/upload-pages-artifact` with `path: frontend/constella-frontend/dist`.
  - `deploy` job: `actions/deploy-pages`, environment `github-pages`.
- [ ] **`CLAUDE.md`:** note that the landing page deploys to GitHub Pages on push to `main`, with production `base` `/Constellate/`.

### Verify
- `npm run build` and `npm run lint` pass; `dist/index.html` references `/Constellate/assets/...` and `/Constellate/favicon.svg`.
- `npm run preview` → check `http://localhost:4173/Constellate/`.
- After merging to `main`: the workflow run succeeds and the live URL loads with styles, fonts and favicon.

### Later: pages that need the backend
Keep them out of this build. Put app pages in a separate frontend (e.g. `frontend/constella-app/`) deployed with the backend on a host that can run it. The Pages workflow only watches `frontend/constella-frontend/**`, so it never ships pages that would break without the API. Move shared UI into a shared package when both need it.
