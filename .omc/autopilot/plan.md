# Oh-My-Survey MVP Implementation Plan (Revised)

## Overview
32+ tasks across 8 phases for Typeform-style survey builder MVP.

---

## Phase 1: Foundation (T1-T6)

### T1: Project Scaffolding
- Run `pnpm create next-app@latest` with TypeScript, ESLint, Tailwind, App Router
- Configure `.env.local.example` with placeholders
- Create base directory structure per spec

### T2: Core Dependencies
Install and configure:
- `drizzle-orm`, `drizzle-kit`, `postgres`
- `next-auth@beta`, `@auth/drizzle-adapter`
- `zod`, `nanoid`, `slugify`
- `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`
- `googleapis` (for Sheets sync)
- `tailwind-merge`, `clsx`, `class-variance-authority`
- `lucide-react`

### T3: Database Schema
Create `src/lib/db/schema.ts` with:
- Enums: `survey_status`, `survey_theme`, `question_type`
- Tables: `users`, `accounts`, `sessions`, `verification_tokens` (NextAuth)
- Tables: `surveys`, `questions`, `responses`
- All relations defined
- Type exports for each table

### T4: Database Setup
- Create `drizzle.config.ts`
- Run `pnpm db:generate` for initial migration
- Create `src/lib/db/index.ts` with connection

### T5: NextAuth Configuration
- Create `src/lib/auth.ts` with Google OAuth
- Setup Drizzle adapter
- Create `src/app/api/auth/[...nextauth]/route.ts`
- Session callbacks for user data

### T6: shadcn/ui Components
Install via CLI:
- button, input, textarea, label
- card, dialog, dropdown-menu, select
- toast, toaster, badge, skeleton
- avatar, progress, switch, tabs

---

## Phase 2: Theme System (T7)

### T7: Theme System
- Create CSS variables in `globals.css` for light/dark/minimal themes
- Create `ThemeProvider` component with context
- Create `theme-selector.tsx` component with 3 options
- Hook: `useTheme()` for accessing current theme

---

## Phase 3: API Layer (T8-T17)

### T8: Survey List & Create API
- `GET /api/surveys` - List user's surveys with counts
- `POST /api/surveys` - Create survey (generate slug with nanoid)
- Zod validation schemas

### T9: Survey Detail API
- `GET /api/surveys/[id]` - Get with questions
- `PATCH /api/surveys/[id]` - Update title, theme, logo, sheetsConfig
- `DELETE /api/surveys/[id]` - Cascade delete

### T10: Survey Publish API
- `POST /api/surveys/[id]/publish`
- Actions: publish, unpublish, close
- Validate has at least 1 question before publish

### T11: Question List & Create API
- `GET /api/surveys/[id]/questions` - Ordered list
- `POST /api/surveys/[id]/questions` - Create with auto-order
- Validate: type enum, options for multiple_choice (2-10)

### T12: Question Update & Delete API
- `PATCH /api/surveys/[id]/questions/[qid]` - Update title, options, required
- `DELETE /api/surveys/[id]/questions/[qid]` - Delete and reindex order

### T13: Question Reorder API
- `PATCH /api/surveys/[id]/questions/reorder`
- Accept: `{ questionIds: string[] }`
- Bulk update order values in transaction

### T14: Responses List API
- `GET /api/surveys/[id]/responses` - Paginated list
- Query params: page, limit (max 100)
- Return with pagination metadata

### T15: CSV Export API
- `GET /api/surveys/[id]/responses/export`
- Stream CSV with headers from question titles
- Handle all answer types (string, array, number)

### T16: Google Sheets Sync API
- `POST /api/surveys/[id]/sync-sheets`
- Accept: spreadsheetId, sheetName (optional)
- Use googleapis with service account
- Append all responses as rows

### T17: Public Survey API
- `GET /api/public/surveys/[slug]` - Get survey for respondent (no auth)
- `POST /api/public/surveys/[slug]/responses` - Submit response
- Validate all required questions answered
- Store IP address

---

## Phase 4: Dashboard UI (T18-T22)

### T18: Dashboard Layout
- Create `src/app/(dashboard)/layout.tsx`
- Header component with logo, user nav
- Sidebar with navigation links
- Protected route (redirect if not authenticated)

### T19: Survey List Page
- `src/app/(dashboard)/page.tsx` or `surveys/page.tsx`
- Grid of SurveyCard components
- Show: title, status badge, question count, response count
- "Create Survey" button → dialog or `/surveys/new`

### T20: New Survey Page
- `src/app/(dashboard)/surveys/new/page.tsx`
- Form: title input, theme selector
- On submit: create via API, redirect to edit page

### T21: Survey Settings Page
- `src/app/(dashboard)/surveys/[id]/settings/page.tsx`
- Title editing
- Theme selector (3 options)
- Logo uploader
- Google Sheets configuration
- Danger zone: delete survey

### T22: Logo Upload Component
- Drag-and-drop zone
- Preview image
- Convert to base64
- Validate: <2MB, image types only
- POST to /api/upload/logo (or inline)

---

## Phase 5: Question Builder (T23-T27)

### T23: Question List with DnD
- `src/app/(dashboard)/surveys/[id]/edit/page.tsx`
- Use @dnd-kit/sortable for drag-and-drop
- Reorder calls `PATCH /questions/reorder` API
- Show question type icon, title, required badge

### T24: Question Type Picker
- Modal or dropdown with 5 types
- Icons and descriptions for each
- On select: open editor or create directly

### T25: Question Editor Panel
- Edit title (textarea for long questions)
- For multiple_choice: add/remove/edit options
- Toggle required switch
- Save/Cancel buttons

### T26: Question Type Configs
Create config components for each type:
- `short-text-config.tsx` - placeholder setting
- `long-text-config.tsx` - placeholder setting
- `multiple-choice-config.tsx` - options list editor
- `yes-no-config.tsx` - custom labels (optional)
- `rating-config.tsx` - scale display

### T27: Live Preview Panel
- Side panel showing respondent view
- Updates as questions change
- Toggle mobile/desktop preview
- Apply current theme

---

## Phase 6: Public Survey (T28-T33)

### T28: Survey Container
- `src/app/s/[slug]/page.tsx`
- Fetch survey via public API
- Apply theme via data attribute
- Manage currentQuestionIndex state
- Handle 404 for invalid slug

### T29: Question Input Components
Create 5 input components in `src/components/survey/inputs/`:
- `short-text.tsx` - Input with 255 char limit
- `long-text.tsx` - Textarea with 2000 char limit
- `multiple-choice.tsx` - Radio buttons from options
- `yes-no.tsx` - Two large buttons
- `rating.tsx` - 5 clickable stars

### T30: Question View Component
- Renders current question with animation
- Shows question title
- Renders appropriate input component
- Validates required before allowing next

### T31: Navigation & Transitions
- Previous/Next buttons
- CSS transitions (translateY, opacity)
- Progress bar showing completion %
- Keyboard navigation (Enter = next)

### T32: Completion Screen
- Thank you message
- Optional "Submit another response" link
- Confetti animation (optional)

### T33: Response Submission
- Collect all answers in state
- Submit to public API on final question
- Show loading state
- Handle errors gracefully

---

## Phase 7: Responses UI (T34-T36)

### T34: Responses List Page
- `src/app/(dashboard)/surveys/[id]/responses/page.tsx`
- Table with pagination
- Columns: submitted date, answer preview, IP
- Click row → detail view

### T35: Response Detail View
- Modal or slide-over panel
- Show all questions with answers
- Format answers by type (stars for rating, etc.)

### T36: Export & Sync UI
- "Download CSV" button → calls export API
- "Sync to Google Sheets" button
- Configure spreadsheet ID/name
- Show last sync timestamp

---

## Phase 8: Testing & Deployment (T37-T40)

### T37: Unit Tests
- Vitest configuration
- Test all Zod validators
- Test utility functions (slug generation, etc.)
- Test API route handlers with mocked DB
- Target: 90%+ coverage on `/src/lib`

### T38: Integration Tests
- Test database queries
- Test auth flow
- Test survey CRUD with real DB
- Test response submission flow

### T39: E2E Tests
- Playwright configuration
- Test: Login → Create Survey → Add Questions → Publish
- Test: Navigate to public survey → Submit response
- Test: View responses → Export CSV

### T40: Deployment Setup
- Create `Dockerfile` for Cloud Run
- Create `cloudbuild.yaml`
- Environment variable configuration
- Deploy script or instructions

---

## Dependencies

```
T1 → T2 → T3 → T4 → T5 → T18 (auth needed for dashboard)
           ↓
          T6 (shadcn)
           ↓
          T7 (themes)

T4 → T8 → T9 → T10 (survey APIs)
  → T11 → T12 → T13 (question APIs)
  → T14 → T15 → T16 (response APIs)
  → T17 (public API)

T18 → T19 → T20 → T21 → T22 (dashboard UI)
T11-T13 → T23 → T24 → T25 → T26 → T27 (builder)
T7 + T17 + T29 → T28 → T30 → T31 → T32 → T33 (public survey)
T14-T16 → T34 → T35 → T36 (responses UI)

All features → T37 → T38 → T39 → T40
```

## Parallelization

### Wave 1 (Sequential): T1 → T2 → T3 → T4
### Wave 2 (3 parallel):
- Track A: T5 (auth)
- Track B: T6 (shadcn) → T7 (themes)
- Track C: T8 (survey API)

### Wave 3 (4 parallel):
- Track A: T9 → T10 (survey detail/publish)
- Track B: T11 → T12 → T13 (questions)
- Track C: T14 → T15 → T16 (responses/export)
- Track D: T17 (public API)

### Wave 4 (3 parallel):
- Track A: T18 → T19 → T20 → T21 → T22 (dashboard)
- Track B: T23 → T24 → T25 → T26 → T27 (builder)
- Track C: T28 → T29 → T30 → T31 → T32 → T33 (public)

### Wave 5: T34 → T35 → T36 (responses UI)
### Wave 6: T37 → T38 → T39 → T40 (testing/deploy)

---

## Verification Points

### VP1: Foundation (after T7)
- [ ] `pnpm build` passes
- [ ] `pnpm dev` starts at localhost:3000
- [ ] Database tables created via `pnpm db:push`
- [ ] Google OAuth login works
- [ ] Theme switcher changes CSS variables

### VP2: API Layer (after T17)
- [ ] All survey CRUD operations work via REST
- [ ] Questions can be created, updated, reordered, deleted
- [ ] Public survey returns data without auth
- [ ] Response submission stores in DB

### VP3: Dashboard (after T22)
- [ ] Dashboard shows survey list
- [ ] Can create new survey
- [ ] Can update settings and logo
- [ ] Protected routes redirect to login

### VP4: Builder (after T27)
- [ ] Can add all 5 question types
- [ ] Drag-and-drop reorders questions
- [ ] Live preview updates
- [ ] Changes persist on refresh

### VP5: Public Survey (after T33)
- [ ] Survey loads at `/s/{slug}`
- [ ] All input types work
- [ ] Transitions are smooth
- [ ] Response submitted and stored

### VP6: Responses (after T36)
- [ ] Response list shows submissions
- [ ] CSV downloads correctly
- [ ] Google Sheets sync works

### VP7: Testing (after T40)
- [ ] `pnpm test` passes with 90%+ coverage
- [ ] `pnpm test:e2e` all green
- [ ] Build creates deployable artifact
