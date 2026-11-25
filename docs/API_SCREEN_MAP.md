# CCI STEM Connect — Screen-to-API Map & Backend Gap Tracker

## 1. Screen-to-Endpoint Mapping

| Route | Access Tier | Backend API Endpoints Used |
| --- | --- | --- |
| `/assessment` | Public | `GET /api/v1/events` |
| `/assessment/verify` | Public | `GET /api/v1/participants/lookup` (non-enumerating, OTP-ready) |
| `/assessment/profile` | Public | In-memory context (`profile_updates` sent on submission) |
| `/assessment/questions` | Public | `GET /api/v1/pillars`, `GET /api/v1/questionnaires`, `GET /api/v1/questionnaires/{id}`, `GET /api/v1/question-cards` |
| `/assessment/review` | Public | `POST /api/v1/assessments/submit` |
| `/assessment/success` | Public | Displays server confirmation metadata from submit response |
| `/follow-up` | Public | `GET /api/v1/events`, `GET /api/v1/follow-ups/stages`, `GET /api/v1/participants/lookup`, `POST /api/v1/impact/actions`, `POST /api/v1/impact/connections`, `POST /api/v1/impact/outcomes` |
| `/follow-up/{30,60,90}-days` | Public | `GET /api/v1/follow-ups/stages`, `GET /api/v1/questionnaires/{id}`, `POST /api/v1/follow-ups/{follow_up_id}/submit` |
| `/impact-report` | Public (Auth Gated) | `GET /api/v1/participants/lookup` (never exposes admin-only `/reports/participants/{id}` publicly) |
| `/admin` | Admin Proxy | `GET /api/v1/events`, `GET /api/v1/analytics/events/{id}/overview`, `GET /api/v1/analytics/events/{id}/pillars` |
| `/admin/events` | Admin Proxy | `GET/POST /api/v1/events`, `PATCH /api/v1/events/{id}` |
| `/admin/events/[eventId]` | Admin Proxy | `GET /api/v1/events/{id}`, `GET /api/v1/events/{id}/participants`, `GET /api/v1/analytics/events/{id}/overview`, `POST /api/v1/scoring/calculate-event/{id}` |
| `/admin/participants` | Admin Proxy | `GET /api/v1/events/{id}/participants`, `POST /api/v1/participants`, `POST /api/v1/participants/import` (2-step `dry_run=true` then `false`) |
| `/admin/participants/[participantId]` | Admin Proxy | `GET /api/v1/participants/{id}`, `GET /api/v1/participants/{id}/impact`, `GET /api/v1/participants/{id}/assessments`, `GET /api/v1/participants/{id}/follow-ups`, `POST /api/v1/scoring/calculate/{id}`, `POST /api/v1/follow-ups` |
| `/admin/attendance` | Admin Proxy | `GET /api/v1/events/{id}/participants`, `POST /api/v1/events/{id}/attendance` |
| `/admin/question-cards` | Admin Proxy | `GET/POST /api/v1/question-cards`, `PATCH /api/v1/question-cards/{id}`, `POST /api/v1/question-cards/{id}/questions` |
| `/admin/questions` | Admin Proxy | `GET/POST /api/v1/questions`, `PATCH /api/v1/questions/{id}`, `PATCH /api/v1/questions/{id}/archive`, `GET /api/v1/pillars` |
| `/admin/questionnaires` | Admin Proxy | `GET/POST /api/v1/questionnaires`, `GET /api/v1/questionnaires/{id}`, `POST /api/v1/questionnaires/{id}/publish` |
| `/admin/assessments` | Admin Proxy | `GET /api/v1/analytics/events/{id}/overview`, `GET /api/v1/analytics/events/{id}/pillars`, `GET /api/v1/participants/{id}/assessments`, `GET /api/v1/assessments/{id}` |
| `/admin/scoring` | Admin Proxy | `GET /api/v1/pillars`, `GET/POST /api/v1/scoring/frameworks`, `GET /api/v1/scoring/events/{id}`, `POST /api/v1/scoring/calculate-event/{id}` |
| `/admin/networking` | Admin Proxy | `GET /api/v1/analytics/events/{id}/networking` |
| `/admin/follow-ups` | Admin Proxy | `GET /api/v1/analytics/events/{id}/follow-ups`, `GET/POST /api/v1/follow-ups`, `PATCH /api/v1/impact/outcomes/{id}/verify` |
| `/admin/analytics` | Admin Proxy | `GET /api/v1/analytics/events/{id}/{overview,pillars,networking,application,follow-ups}`, `GET /api/v1/events/{id}/participants` |
| `/admin/reports` | Admin Proxy | `GET /api/v1/reports/events/{id}`, `GET /api/v1/reports/participants/{id}`, `POST /api/v1/reports/events/{id}/export`, `POST /api/v1/reports/participants/{id}/export` |
| `/admin/settings` | Admin Proxy | `GET /health`, `GET/POST /api/v1/follow-ups/stages` |

## 2. Documented Backend Gaps (Recommended for v1.1)

Per Section 7 & Section 15 of the Frontend Specification, the frontend does not invent unsupported endpoints or expose administrative routes to public browsers. The following endpoints are documented for backend coordination:

1. **Participant OTP Verification & Short-Lived Session Token** (`POST /api/v1/participants/verify-otp` + `GET /api/v1/me/profile`, `GET /api/v1/me/follow-ups`, `GET /api/v1/me/impact-report`)
   - Required to safely pre-fill confirmed participant profiles on `/assessment/profile`, show completion badges for prior follow-up stages on `/follow-up`, and unlock `/impact-report` for participants.
2. **Direct Report File / PDF Download Endpoint** (`GET /api/v1/reports/{report_record_id}/download`)
   - Currently `POST /api/v1/reports/.../export` generates `json`, `csv`, or `xlsx` and returns `file_path` + JSON report payload. A signed binary download endpoint (including PDF) will enable direct file downloads.
3. **Paginated Cross-Event Assessments List** (`GET /api/v1/assessments?event_id=&stage=&limit=&offset=`)
   - Currently assessments are queried by participant or by assessment UUID.
4. **Global Participants Search Endpoint** (`GET /api/v1/participants?search=&limit=&offset=`)
   - Currently participants are listed per event via `GET /api/v1/events/{event_id}/participants`.
5. **Server-Side Analytics Demographic Filters** (`date_from`, `date_to`, `industry`, `role`, `stage`)
   - Currently demographic filtering is applied to participant distribution charts; server-side filter parameters on `/api/v1/analytics/events/{event_id}/*` will enable cross-filtering pillar and follow-up metrics.
6. **Save-and-Resume Draft Assessments** (`POST /api/v1/assessments/drafts`, `PATCH /api/v1/assessments/drafts/{id}`)
   - Currently assessment responses are held safely in-memory until submitted via `POST /api/v1/assessments/submit`.
7. **System Notification & Data Retention Settings Endpoints**
   - Controls for these settings are intentionally omitted from `/admin/settings` until supported by the backend.
