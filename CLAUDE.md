# Oh-My-Survey - Claude Code Instructions

## CRITICAL SAFETY RULES (MUST ALWAYS FOLLOW)

**DANGEROUS COMMANDS - ALWAYS ASK PERMISSION FIRST:**

Before executing ANY of these commands, you MUST ask the user for explicit permission:

- `rm -rf` - Recursive force delete (NEVER execute without permission)
- `rm -r` - Recursive delete
- `git reset --hard` - Discard all changes
- `git clean -f` - Force clean untracked files
- `DROP TABLE` / `DROP DATABASE` - Database deletion

Example: "I need to delete the `data/pglite` directory. May I run `rm -rf data/pglite`?"

**This rule has NO exceptions. Always ask first, even if it seems routine.**

---

## Testing Guidelines

**CRITICAL: HEADLESS ONLY - NO BROWSER AUTOMATION**

- Use `pnpm test` for unit tests (Vitest)
- Use `pnpm test:e2e` for E2E tests (Playwright headless)
- Use `curl` or direct API calls for API testing

**FORBIDDEN:**
- MCP chrome tools (claude-in-chrome)
- Opening browser windows
- Any visual browser automation
- Screenshot-based testing via browser

**Sub-agents MUST follow these rules. No exceptions.**

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
