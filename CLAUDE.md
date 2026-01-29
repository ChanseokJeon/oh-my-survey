# Oh-My-Survey - Claude Code Instructions

## Testing Guidelines

**IMPORTANT: Always test headlessly or via API. Never use browser automation (MCP chrome tools).**

- Use `pnpm test` for unit tests (Vitest)
- Use `pnpm test:e2e` for E2E tests (Playwright headless)
- Use `curl` or direct API calls for API testing
- Never open browser windows for testing

## Project Overview

Typeform-style survey web builder MVP with:
- Next.js 15 (App Router)
- Drizzle ORM + PostgreSQL
- shadcn/ui + Tailwind CSS
- NextAuth.js v5

## Key Commands

```bash
pnpm dev          # Start dev server (localhost:3000)
pnpm build        # Production build
pnpm test         # Run unit tests
pnpm test:e2e     # Run E2E tests (headless)
pnpm typecheck    # TypeScript check
pnpm lint         # ESLint
```

## Database

- PostgreSQL via Docker on port 5433
- Container: `oh-my-survey-db`
- Connection: `postgresql://survey:survey123@localhost:5433/oh_my_survey`

## Test Credentials

- Email: `test@example.com`
- Password: `test1234`
