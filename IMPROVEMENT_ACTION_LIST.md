# Improvement Action List

> This document breaks down **every recommendation** from the recent code-base review into micro-actions.  Each task is a single, verifiable change that can be completed and code-reviewed independently.  Use GitHub Issues or a project board to track progress.

---

## Legend
- [ ] = not started
- [▶] = in progress
- [✓] = completed

---

## 1. Architecture & Back-End

### 1.1 Migrations & Schema Ownership
- [ ] Extract all `ensureTablesExist()` DDL into individual SQL files under `/sql/migrations/ YYYYMMDD_create_*.sql`.
- [ ] Add a Supabase CLI project and link to existing database.
- [ ] Write `npm run db:migrate` script that calls `supabase db push`.
- [ ] Remove runtime table creation logic from `lib/data-service.ts`.
- [ ] Configure CI to fail if pending migrations exist.

### 1.2 Supabase Optimisation
- [ ] Identify every `fetch*` call that loops over results (e.g. `fetchResponsibilities` inside `Dashboard`).
- [ ] Create a Postgres RPC (`supabase.functions.sql`) that returns all needed records in a single query.
- [ ] Replace client-side loops with single RPC call.
- [ ] Write RLS policies (`policies.sql`) for each table (read, insert, update, delete).
- [ ] Enable row-level security on all tables.

### 1.3 Server Components & Data Fetching
- [ ] Create `components/dashboard/` folder.
- [ ] Move pure-display parts of `dashboard.tsx` into server components (`*Server.tsx`).
- [ ] Wrap heavy queries with `cache()` and `Suspense`.
- [ ] Introduce TanStack Query provider in `app/layout.tsx`.
- [ ] Replace custom refresh logic with Query invalidation.

### 1.4 Environment Safety
- [✓] Add runtime check in `lib/supabase.ts` to throw if URL or KEY env vars are missing.
- [ ] Move any server-side only secrets to Next.js server functions.

---

## 2. Code Quality / DX

### 2.1 TypeScript & Linting
- [✓] Enable `"strict": true` in `tsconfig.json`.
- [✓] Add `eslint-config-next` + `@typescript-eslint`.
- [✓] Configure `prettier` and `.editorconfig`.
- [ ] Create `lint-staged` + `husky` pre-commit hook.
- [✓] Fix resulting type and lint errors project-wide.

### 2.2 Testing
- [✓] Install `vitest`, `@testing-library/react`, `jsdom`.
- [✓] Write unit tests for `lib/utils.ts`.
- [✓] Add tests for auth context (`contexts/__tests__/auth-context.test.tsx`).
- [ ] Configure Playwright and write happy-path E2E: signup → login → CRUD group.
- [✓] Add `npm run test:ci` script and integrate in GitHub Actions.

### 2.3 Modularisation
- [▶] Split `dashboard.tsx` into feature slices:
  - [✓] `groups/GroupSection.tsx`
  - [✓] `categories/CategorySection.tsx`
  - [✓] `people/PeopleSection.tsx`
  - [ ] `tasks/TasksSection.tsx`
- [✓] Extract Toast helpers to `lib/toast.ts`.
- [✓] Create shared CRUD hooks in `hooks/use-crud.ts`.

### 2.4 Naming Consistency
- [✓] Create constant `BRAND_NAME = "Land iQ - Project Management"` in `lib/constants.ts`.
- [✓] Replace hard-coded titles/meta in `app/layout.tsx`, `app/page.tsx`, e-mails, etc.

---

## 3. Security

- [✓] Replace `ADMIN_EMAILS` hard-coded list with `admin_users` table.
- [✓] Build admin UI to promote/demote users.
- [ ] Add Supabase rate-limit extension and apply to `auth.signIn` and `signUp`.
- [ ] Enable TOTP in Supabase Auth settings.
- [ ] Escape CSV fields and stream exports (use `fast-csv`).

---

## 4. UX / UI

### 4.1 Accessibility
- [ ] Audit all dialogs/dropdowns for ARIA labels.
- [ ] Ensure focus-trap in custom Modals (`dialog.tsx`).
- [ ] Add keyboard shortcut "?" to open **How to Use** modal.

### 4.2 Performance
- [ ] Install `@tanstack/react-virtual`.
- [ ] Virtualise rows in `groups-table.tsx`, `people-table.tsx`, etc.
- [ ] Lazy-load charts with `next/dynamic`.

### 4.3 Error Boundaries
- [✓] Create `components/ErrorBoundary.tsx`.
- [✓] Wrap each page route with boundary component.

---

## 5. CI/CD & Observability

- [ ] Add GitHub Action: `lint → type-check → test → db:migrate`.
- [ ] Configure Vercel Preview for PRs.
- [ ] Add Sentry (`@sentry/nextjs`) and set DSN env var.
- [ ] Forward Supabase function logs to Slack webhook.

---

## 6. New Functionality

### 6.1 Global Search
- [✓] Investigate `pg_trgm` extension and create "search" RPC.
- [✓] Build search bar component (`components/GlobalSearch.tsx`).

### 6.2 Gantt / Timeline View
- [ ] Pick library (`vis-timeline` or `react-gantt`).
- [ ] Create `/gantt` route with server component fetching allocations & leave.

### 6.3 Audit Log
- [✓] Create `audit_log` table (user_id, action, entity, payload, ts).
- [✓] Insert trigger functions on each CRUD table.
- [✓] Build viewer component for admins.

### 6.4 Notification Centre
- [✓] Enable Supabase Realtime on relevant tables.
- [✓] Create `NotificationContext` + bell icon badge.
- [✓] Push toast when new assignment row appears.

### 6.5 Role Editor UI
- [ ] Build `components/admin/user-role-table.tsx`.
- [ ] Allow inline promotion/demotion with RLS ‘is_admin’ guard.

### 6.6 CSV Import Wizard
- [ ] Install `papaparse`.
- [ ] Build drag-and-drop component with data preview + validation.
- [ ] Map CSV columns to DB schema then bulk insert.

### 6.7 Integrations
- [ ] Add Supabase Function to post to Slack via Incoming Webhook.
- [ ] Add Confluence exporter: convert markdown to Confluence wiki markup.

### 6.8 Offline-first PWA
- [ ] Add Next.js PWA plugin (`next-pwa`).
- [ ] Cache static assets + API responses in Service Worker.
- [ ] Detect offline state and queue mutations in IndexDB.

---

## 7. Documentation

- [ ] Update `README.md` with setup, env vars, and scripts.
- [ ] Add `docs/architecture.md` with diagrams (PlantUML or Mermaid).
- [ ] Document RLS policies and deployment checklist.

---

*Last updated: <!-- NOTE: update date when editing --> 