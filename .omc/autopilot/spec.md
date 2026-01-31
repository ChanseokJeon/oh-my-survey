# Oh-My-Survey MVP Specification

## 1. Product Overview

Oh-My-Survey is a Typeform-style survey web builder MVP featuring:
- One question per screen with smooth CSS transitions
- 5 question types (Short Text, Long Text, Multiple Choice, Yes/No, Rating 1-5)
- 3 preset themes (Light, Dark, Minimal)
- Anonymous response collection
- Google Sheets manual sync and CSV export

## 2. Key Decisions

| Area | Decision | Rationale |
|------|----------|-----------|
| Authentication | NextAuth.js + Google OAuth | Simplest for MVP |
| Typeform-style | One question per screen + CSS transitions | Core UX requirement |
| Google Sheets sync | Manual trigger (button click) | Avoids webhook complexity |
| Rating scale | 1-5 stars | Standard and simple |
| Responses | Anonymous, no edit after submission | Privacy-friendly MVP |
| Logo storage | Base64 in DB (<2MB) | Simpler than file storage |

## 3. Tech Stack

- **Frontend/Backend:** Next.js 15 (App Router)
- **Database:** PostgreSQL with Drizzle ORM
- **UI:** shadcn/ui + Tailwind CSS
- **Auth:** NextAuth.js v5
- **Testing:** Vitest + Playwright
- **Deployment:** Cloud Run

## 4. Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-1 | Survey CRUD | P0 |
| FR-2 | 5 question types | P0 |
| FR-3 | 3 preset themes | P0 |
| FR-4 | Logo upload | P1 |
| FR-5 | Response submission | P0 |
| FR-6 | View responses | P0 |
| FR-7 | CSV export | P0 |
| FR-8 | Google Sheets sync | P1 |
| FR-9 | Required/optional questions | P1 |
| FR-10 | Question reordering | P1 |

## 5. Database Schema

```
users (id, email, name, image, created_at, updated_at)
  |
accounts (NextAuth)
sessions (NextAuth)
  |
surveys (id, user_id, title, slug, status, theme, logo_base64, sheets_config, created_at, updated_at)
  |
  ├── questions (id, survey_id, type, title, options, required, order, created_at, updated_at)
  |
  └── responses (id, survey_id, answers_json, completed_at, ip_address)
```

### Status Enum: draft | published | closed
### Theme Enum: light | dark | minimal
### Question Type Enum: short_text | long_text | multiple_choice | yes_no | rating

## 6. API Endpoints

### Surveys
- `GET /api/surveys` - List user's surveys
- `POST /api/surveys` - Create survey
- `GET /api/surveys/[id]` - Get survey details
- `PATCH /api/surveys/[id]` - Update survey
- `DELETE /api/surveys/[id]` - Delete survey
- `POST /api/surveys/[id]/publish` - Publish/unpublish

### Questions
- `GET /api/surveys/[id]/questions` - List questions
- `POST /api/surveys/[id]/questions` - Create question
- `PATCH /api/surveys/[id]/questions/[qid]` - Update question
- `DELETE /api/surveys/[id]/questions/[qid]` - Delete question
- `PATCH /api/surveys/[id]/questions/reorder` - Reorder questions

### Responses
- `GET /api/surveys/[id]/responses` - List responses
- `GET /api/surveys/[id]/responses/export` - Export CSV
- `POST /api/surveys/[id]/sync-sheets` - Sync to Google Sheets

### Public
- `GET /api/public/surveys/[slug]` - Get survey for respondent
- `POST /api/public/surveys/[slug]/responses` - Submit response

### Upload
- `POST /api/upload/logo` - Upload logo (base64)

## 7. Component Structure

### Dashboard Layout
- Header (Logo, UserNav)
- Sidebar (Navigation)
- Main Content

### Survey Builder
- QuestionBuilder
- QuestionList (drag-and-drop with @dnd-kit)
- QuestionTypePicker
- QuestionEditor

### Public Survey (Respondent)
- SurveyContainer
- ProgressBar
- QuestionView (with transitions)
- Input components per type
- CompletionScreen

## 8. Theme Variables

```css
:root[data-theme="light"] {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 221.2 83.2% 53.3%;
}

:root[data-theme="dark"] {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --primary: 217.2 91.2% 59.8%;
}

:root[data-theme="minimal"] {
  --background: 0 0% 98%;
  --foreground: 0 0% 20%;
  --primary: 0 0% 20%;
}
```

## 9. Out of Scope (v2)

- Conditional logic / branching
- Role-based access control
- Additional question types
- Custom theme builder
- Batch/scheduled sync
- Undo/redo
- Analytics dashboard
- Multi-language
- Offline support
- Survey templates
- Team collaboration
