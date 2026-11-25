# CCI STEM Connect — Admin Panel API Integration Assessment

**Scope:** Audit of the deployed FastAPI REST API v1.0 against the Admin Dashboard requirements (`/admin/*`).

---

## 1. Available Backend Endpoints (Verified in API Guide v1.0)

| Domain | Endpoints | Auth Tier | Notes |
| --- | --- | --- | --- |
| **Health** | `GET /health` | Public | Service status & environment |
| **Events** | `GET /api/v1/events`, `GET /api/v1/events/{id}`, `POST /api/v1/events`, `PATCH /api/v1/events/{id}` | Public (GET) / Admin (write) | Full CRUD for events |
| **Event Roster & Attendance** | `GET /api/v1/events/{id}/participants`, `POST /api/v1/events/{id}/registrations`, `POST /api/v1/events/{id}/attendance` | Admin (`X-API-Key`) | Paginated (`limit`, `offset`), separate registration & attendance records |
| **Participants** | `POST /api/v1/participants`, `GET /api/v1/participants/lookup`, `POST /api/v1/participants/import`, `GET/PATCH /api/v1/participants/{id}`, `GET /api/v1/participants/{id}/impact` | Admin (`X-API-Key`) | Lookup is dual-mode (non-enumerating public vs full metadata admin) |
| **Question Cards** | `GET /api/v1/question-cards`, `GET /api/v1/question-cards/{id}`, `POST/PATCH /api/v1/question-cards`, `POST /api/v1/question-cards/{id}/questions` | Public (GET) / Admin (write) | Supports active/inactive archiving (`is_active`) & ordering (`display_order`) |
| **Questions** | `GET /api/v1/questions`, `GET /api/v1/questions/{id}`, `POST/PATCH /api/v1/questions`, `PATCH /api/v1/questions/{id}/archive` | Public (GET) / Admin (write) | Supports pillar mapping (`pillar_ids`), options, scorable & explanation flags |
| **Questionnaires** | `GET /api/v1/questionnaires`, `GET /api/v1/questionnaires/{id}`, `POST/PATCH /api/v1/questionnaires`, `POST /api/v1/questionnaires/{id}/publish` | Public (GET) / Admin (write) | Full section + question structure returned by `GET /{id}` |
| **Assessments** | `POST /api/v1/assessments/submit`, `GET /api/v1/assessments/{id}`, `GET /api/v1/participants/{id}/assessments` | Public (submit) / Admin (GET) | Individual submission inspection & per-participant history |
| **Pillars & Scoring** | `GET /api/v1/pillars`, `GET/POST/PATCH /api/v1/scoring/frameworks`, `POST /api/v1/scoring/calculate/{participant_id}`, `POST /api/v1/scoring/calculate-event/{event_id}`, `GET /api/v1/scoring/participants/{id}`, `GET /api/v1/scoring/events/{id}` | Public (pillars) / Admin (scoring) | Missing pillars return `normalised_score: null` and renormalise weights server-side |
| **Follow-Ups & Impact** | `GET/POST /api/v1/follow-ups/stages`, `GET/POST /api/v1/follow-ups`, `POST /api/v1/follow-ups/{id}/submit`, `GET /api/v1/participants/{id}/follow-ups`, `POST/PATCH /api/v1/impact/actions`, `POST /api/v1/impact/connections`, `POST /api/v1/impact/outcomes`, `POST /api/v1/impact/outcomes/{id}/evidence`, `PATCH /api/v1/impact/outcomes/{id}/verify` | Mixed Public / Admin | Full longitudinal tracking & evidence classification (`self_reported`, `documented`, `verified`) |
| **Analytics** | `GET /api/v1/analytics/events/{id}/{overview,pillars,networking,application,follow-ups}` | Admin (`X-API-Key`) | Returns `null` stats when `response_count === 0` + `data_coverage` |
| **Reports & Exports** | `GET /api/v1/reports/events/{id}`, `GET /api/v1/reports/participants/{id}`, `POST /api/v1/reports/events/{id}/export`, `POST /api/v1/reports/participants/{id}/export` | Admin (`X-API-Key`) | Supports `json`, `csv`, `xlsx` export generation |

---

## 2. Missing Endpoints & Current Frontend Adaptation

The following endpoints are **not yet present** in API v1.0. No fake data or invented endpoints are used; where possible, the frontend composes real existing endpoints safely and documents the recommended backend extensions:

| Gap | Current Frontend Strategy | Recommended Backend Extension (v1.1) |
| --- | --- | --- |
| **Event-wide Assessment List** (`GET /api/v1/assessments`) | Fetches bounded participant batch (`GET /api/v1/events/{id}/participants`) and loads per-participant submissions (`GET /api/v1/participants/{id}/assessments?event_id=...`) with TanStack Query caching & concurrency throttling (max 4 in-flight, default window of 25 participants with explicit "Load more" button) to stay well inside the `120 req/min` rate limit. | `GET /api/v1/assessments?event_id=&questionnaire_id=&status=&limit=&offset=` returning paginated submissions with participant name & metadata. |
| **Qualitative Feedback Feed** (`GET /api/v1/feedback`) | Extracts real verbatim qualitative (`short_text`, `long_text`, `explanation_text`) and reflective question card responses from cached event assessment submissions, cross-referenced with `GET /api/v1/questions` and `GET /api/v1/question-cards`. | `GET /api/v1/analytics/events/{id}/feedback?question_id=&pillar_id=&card_id=&date_from=&date_to=&limit=&offset=` for fast server-side filtering across large cohorts. |
| **Global Participant Directory** (`GET /api/v1/participants`) | Scoped to active event selector via `GET /api/v1/events/{id}/participants` (paginated). | `GET /api/v1/participants?search=&industry=&limit=&offset=` for cross-event participant search. |
| **Admin Session Authentication & RBAC** | Server-side Next.js Route Handler (`/api/admin/[...path]`) attaches `X-API-Key` from `process.env.ADMIN_API_KEY` (never exposed to browser). Production requires deployment-level access control + `ADMIN_DASHBOARD_ENABLED=true`. | `POST /api/v1/admin/auth/login`, `POST /api/v1/admin/auth/logout`, `GET /api/v1/admin/auth/me` with HTTP-only session cookies and RBAC roles (`super_admin`, `event_admin`, `reviewer`, `analyst`). |
| **Direct Binary Report / PDF Download** | Triggers backend `POST /api/v1/reports/.../export` and downloads JSON/CSV datasets client-side where authorised. | `GET /api/v1/reports/records/{report_record_id}/download` streaming signed `.csv`, `.xlsx`, or `.pdf` files. |

---

## 3. Security & Authentication Requirements

- **Zero secrets in client code:** `ADMIN_API_KEY` is read strictly on the Next.js server inside `app/api/admin/[...path]/route.ts`.
- **No fake login screen:** Until backend administrator authentication & RBAC endpoints exist, `/admin` does not present a fake password form.
- **Deployment gate:** In `NODE_ENV=production`, `/api/admin/*` returns `403 FORBIDDEN` unless `ADMIN_DASHBOARD_ENABLED=true` is explicitly configured alongside deployment-level access controls (e.g., Cloudflare Access, VPN, or reverse-proxy authentication).
- **Rate limits respected:** `GET /api/v1/participants/lookup` (`15 req/min`), submit endpoints (`30 req/min`), and admin endpoints (`120 req/min`) are respected with TanStack Query caching and `429 Retry-After` handling.
