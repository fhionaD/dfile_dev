# MonsterASP API 404 — Implementation Plan (Next.js + ASP.NET)

This is the concrete rollout plan to fix `POST /api/auth/login` returning `404` in production.

## 1) Decide your deployment topology (required)

Pick **one** and keep it consistent:

### Topology A — Single host (recommended)
- Domain: `https://dfile.runasp.net`
- ASP.NET app serves:
  - API routes (`/api/...`)
  - static frontend files from `wwwroot`
- Frontend should call relative API paths (`/api/auth/login`).

### Topology B — Split hosts
- Frontend: `https://dfile.runasp.net`
- Backend: `https://<your-api-host>`
- Frontend must be built with `NEXT_PUBLIC_API_URL=https://<your-api-host>`.

---

## 2) Code changes included in this implementation

### Frontend API URL handling is now centralized
- Added `src/lib/api-base-url.ts` to:
  - normalize `NEXT_PUBLIC_API_URL`
  - remove trailing slashes
  - build stable URLs like `/api/auth/login`
- Updated auth requests and Axios base URL to use this centralized resolver.
- Added `.env.example` with correct local/prod guidance.

This removes accidental double slashes and inconsistent base URL logic.

---

## 3) MonsterASP deployment steps

## Step A — Validate backend endpoint directly
Run these checks against production:

1. `GET https://dfile.runasp.net/api/health`
2. `POST https://dfile.runasp.net/api/auth/login`
3. `GET https://dfile.runasp.net/swagger`

Expected:
- `api/health` should return `200`.
- `api/auth/login` should return `200` or `401` (not `404`).

If `404`, backend is not mounted on that site root.

## Step B — Build frontend with correct API base

### For Topology A (single host)
- Build frontend with empty API base:
  - `NEXT_PUBLIC_API_URL=`

### For Topology B (split host)
- Build frontend with full backend origin:
  - `NEXT_PUBLIC_API_URL=https://<your-api-host>`

Important: Next.js export embeds env vars at build time; changing server env later does not rewrite built JS.

## Step C — Publish artifacts correctly
- Publish ASP.NET backend to MonsterASP site root.
- If using Topology A, copy Next export output into backend `wwwroot`.
- Ensure backend `web.config` and app startup map controllers before fallback.

---

## 4) Post-deploy verification checklist

- [ ] Browser network calls show requests to the expected API origin.
- [ ] Login request URL is correct and returns `200/401`.
- [ ] `/api/auth/me` works with bearer token.
- [ ] No `404` on `/api/auth/login`.

---

## 5) Hardening after fix (recommended)

- Restrict CORS to explicit origins instead of `AllowAnyOrigin`.
- Add deployment smoke checks (health + auth route) before DNS/live cutover.
- Keep `NEXT_PUBLIC_API_URL` value documented per environment in CI/CD.
