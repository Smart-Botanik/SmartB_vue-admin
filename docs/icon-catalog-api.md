# Icon Catalog API — consumer contract (PNG apply)

**Audience:** team maintaining icons-hub / consumers.  
**Consumer:** SmartБотанik `admin-vue` culture facets editor (LOGO picker).  
**Canonical TS types:** `packages/contracts/src/icon-catalog.ts` (`@growing/contracts`).  
**Also mirrored at:** `packages/contracts/docs/icon-catalog-api.md`  
**Date:** 2026-07-22

Field names below are **camelCase** (preferred). Our client also accepts snake_case aliases (`preview_url`, `download_url`, `file_name`, `mime_type`).

---

## Product decisions (locked)

| Topic | Decision |
|--------|----------|
| Apply format | **PNG only** (`/download-png` → `/file-png`) |
| Download payload | Return a **`downloadUrl`** (not inline body) |
| Empty search | **Forbidden** — no browse / popular feed |
| Consumer apply flow | Client GETs `downloadUrl` → uploads PNG to Media → sets content-edges **LOGO** |
| SVG routes | Exist on hub but **out of scope** for admin apply |
| Auth | TBD — client can send `Authorization: Bearer <jwt>` if required |

---

## Base URL

`VITE_ICON_CATALOG_URL` (no trailing slash). Dev default: `http://127.0.0.1:3020/api/v1`.

---

## Endpoints used by admin-vue

1. `GET /icons/search?q&offset&limit` — grid search (empty `q` → 400)
2. `GET /icons/{id}/download-png` — PNG metadata + `downloadUrl`
3. `GET {downloadUrl}` — PNG bytes → Media upload → LOGO

See full contract: `packages/contracts/docs/icon-catalog-api.md`.

Smoke: `npm run smoke:icon-catalog` in this package.
