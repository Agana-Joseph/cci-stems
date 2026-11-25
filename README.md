# CCI STEM Connect — Frontend Application

Frontend platform for the **CCI STEM Connect Professional Engagement & Impact Measurement System**, built with Next.js (App Router), React, TypeScript (strict mode), Tailwind CSS, React Hook Form, Zod, TanStack Query, TanStack Table, and Recharts.

## Architecture Overview

The application provides two clearly separated experiences connected to the FastAPI backend (`/api/v1`):

### 1. Participant Platform (Public, Mobile-First)
- `/assessment` — Dynamic event welcome page (event details fetched from `GET /api/v1/events`)
- `/assessment/verify` — Privacy-preserving phone/email lookup (`GET /api/v1/participants/lookup`, non-enumerating & OTP-ready)
- `/assessment/profile` — Professional profile confirmation (`profile_updates` transmitted on submission)
- `/assessment/questions` — Six measurement pillars introduction, dynamic multi-section questionnaire engine (all 8 question types), and dynamic reflective Question Cards deck
- `/assessment/review` — Section-by-section review, consent confirmation, and submission (`POST /api/v1/assessments/submit`)
- `/assessment/success` — Confirmation screen with next-step guidance
- `/follow-up`, `/follow-up/30-days`, `/follow-up/60-days`, `/follow-up/90-days` — Longitudinal follow-up assessments + ongoing action, connection, and outcome logging
- `/impact-report` — Verification-gated personal impact report view

### 2. Administration Dashboard (Desktop-Optimised, Responsive)
- `/admin` — Impact Overview KPIs & six-pillar averages with sample size & data coverage badges
- `/admin/events` & `/admin/events/[eventId]` — Event management, roster, and score calculation trigger
- `/admin/participants` & `/admin/participants/[participantId]` — Searchable roster, phone masking toggle, 2-step CSV/Excel import (`dry_run=true` preview → confirm), and participant impact detail view
- `/admin/attendance` — Separate registration vs attendance management with inline upsert
- `/admin/question-cards` — Reflective card management, question creation, and live preview
- `/admin/questions` — Question Bank with pillar mapping, answer options, and soft-archiving
- `/admin/questionnaires` — Section/question builder, reordering, live preview, and publishing
- `/admin/assessments` — Completion metrics, pillar coverage, and individual submission inspection
- `/admin/scoring` — Six-pillar weights, versioned scoring frameworks, and calculation history
- `/admin/networking` — Aggregated networking outcomes & evidence charts
- `/admin/follow-ups` — 30/60/90-day tracking, bulk scheduling, and outcome verification
- `/admin/analytics` — Lazy-loaded Recharts analytics dashboard across all backend analytics endpoints
- `/admin/reports` — Event & participant report previews and JSON/CSV/Excel exports
- `/admin/settings` — Backend health check and supported configuration endpoints only

## Security Model & Deployment Restriction

- **No fake login system** is implemented.
- **No sensitive browser persistence**: Participant contact details and assessment answers are stored strictly in-memory (`AssessmentProvider`) and are never written to `localStorage` or `sessionStorage`.
- **Server-side Admin Proxy**: All `/admin` API calls route through Next.js Route Handler `app/api/admin/[...path]/route.ts`, which injects `X-API-Key` from `process.env.ADMIN_API_KEY` on the server. **`ADMIN_API_KEY` is never exposed in `NEXT_PUBLIC_*` variables or client bundles.**
- **Production Access Control Requirement**: Until full administrator authentication is introduced in the backend, protect `/admin` and `/api/admin/*` at the deployment layer (e.g. Cloudflare Access, reverse-proxy Basic Auth, VPN, or Render private access) and explicitly set `ADMIN_DASHBOARD_ENABLED=true` on the frontend server.

## Getting Started

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment variables**
   Copy `.env.example` to `.env.local` and configure:
   ```bash
   cp .env.example .env.local
   ```
   | Variable | Scope | Description |
   | --- | --- | --- |
   | `NEXT_PUBLIC_API_BASE_URL` | Client & Server | FastAPI backend base URL (e.g. `http://localhost:8000`) |
   | `NEXT_PUBLIC_ESTIMATED_ASSESSMENT_MINUTES` | Client | Configurable completion time shown on `/assessment` (default `8`) |
   | `API_BASE_URL` | Server-only | Optional server override for backend URL |
   | `ADMIN_API_KEY` | Server-only | Matches backend `ADMIN_API_KEY` for `/api/admin/*` proxy |
   | `ADMIN_ACTOR_ID` | Server-only | Audit actor identifier forwarded via `X-Actor-Id` |
   | `ADMIN_DASHBOARD_ENABLED` | Server-only | Set `true` in production only after enabling deployment-level access control |

3. **Run development server**
   ```bash
   npm run dev
   ```

## Scripts

- `npm run dev` — Start Next.js dev server
- `npm run build` — Production build
- `npm run typecheck` — Strict TypeScript check (`tsc --noEmit`)
- `npm run lint` — ESLint check
- `npm test` — Run Vitest unit & component tests
- `npm run format:check` — Prettier formatting check

## Documentation

- [Screen-to-API Map & Backend Gap Tracker](docs/API_SCREEN_MAP.md)
