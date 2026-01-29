# Oh My Survey

Typeform 스타일의 설문 웹페이지 빌더 MVP

## 주요 기능

- **설문 관리**: 설문 생성, 수정, 삭제, 발행/비발행
- **5가지 질문 유형**: 단답형, 장문형, 객관식, 예/아니오, 별점(1-5)
- **3가지 테마**: Light, Dark, Minimal
- **드래그 앤 드롭**: 질문 순서 변경
- **응답 수집**: 익명 응답 저장 및 조회
- **내보내기**: CSV 다운로드, Google Sheets 연동
- **원 퀘스천 퍼 스크린**: Typeform 스타일 UX

## 기술 스택

| 영역 | 기술 |
|------|------|
| Frontend/Backend | Next.js 15 (App Router) |
| Database | PostgreSQL + Drizzle ORM |
| Authentication | NextAuth.js v5 + Google OAuth |
| UI | shadcn/ui + Tailwind CSS |
| Drag & Drop | @dnd-kit |
| Testing | Vitest + Playwright |

## 시작하기

### 1. 의존성 설치

```bash
pnpm install
```

### 2. 환경 변수 설정

```bash
cp .env.local.example .env.local
```

`.env.local` 파일을 열어 다음 값을 설정:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/oh_my_survey"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"

# Google OAuth (https://console.cloud.google.com/apis/credentials)
GOOGLE_CLIENT_ID="your-client-id"
GOOGLE_CLIENT_SECRET="your-client-secret"

# Google Sheets (optional)
GOOGLE_SHEETS_CLIENT_EMAIL=""
GOOGLE_SHEETS_PRIVATE_KEY=""
```

### 3. 데이터베이스 설정

Docker를 사용하는 경우:

```bash
docker run -d --name oh-my-survey-db \
  -e POSTGRES_USER=survey \
  -e POSTGRES_PASSWORD=survey123 \
  -e POSTGRES_DB=oh_my_survey \
  -p 5433:5432 \
  postgres:15-alpine
```

스키마 적용:

```bash
DATABASE_URL="postgresql://survey:survey123@localhost:5433/oh_my_survey" pnpm db:push
```

### 4. 개발 서버 실행

```bash
pnpm dev
```

http://localhost:3000 에서 앱에 접속할 수 있습니다.

## 프로젝트 구조

```
src/
├── app/
│   ├── (auth)/login/           # 로그인 페이지
│   ├── (dashboard)/            # 대시보드 (보호된 라우트)
│   │   ├── page.tsx            # 설문 목록
│   │   └── surveys/[id]/
│   │       ├── edit/           # 질문 빌더
│   │       ├── responses/      # 응답 조회
│   │       └── settings/       # 설문 설정
│   ├── s/[slug]/               # 공개 설문 페이지
│   └── api/                    # 14개 API 라우트
├── components/
│   ├── ui/                     # shadcn 컴포넌트
│   ├── builder/                # 질문 빌더 컴포넌트
│   ├── respondent/             # 공개 설문 컴포넌트
│   └── layout/                 # 레이아웃 컴포넌트
├── lib/
│   ├── db/                     # Drizzle 스키마 및 클라이언트
│   ├── auth.ts                 # NextAuth 설정
│   └── validations/            # Zod 스키마
└── hooks/                      # React 훅
```

## API 엔드포인트

### 설문 API (인증 필요)

| 메서드 | 엔드포인트 | 설명 |
|--------|-----------|------|
| GET | `/api/surveys` | 설문 목록 |
| POST | `/api/surveys` | 설문 생성 |
| GET | `/api/surveys/[id]` | 설문 상세 |
| PATCH | `/api/surveys/[id]` | 설문 수정 |
| DELETE | `/api/surveys/[id]` | 설문 삭제 |
| POST | `/api/surveys/[id]/publish` | 발행/비발행 |

### 질문 API (인증 필요)

| 메서드 | 엔드포인트 | 설명 |
|--------|-----------|------|
| GET | `/api/surveys/[id]/questions` | 질문 목록 |
| POST | `/api/surveys/[id]/questions` | 질문 생성 |
| PATCH | `/api/surveys/[id]/questions/[qid]` | 질문 수정 |
| DELETE | `/api/surveys/[id]/questions/[qid]` | 질문 삭제 |
| PATCH | `/api/surveys/[id]/questions/reorder` | 질문 순서 변경 |

### 응답 API

| 메서드 | 엔드포인트 | 설명 |
|--------|-----------|------|
| GET | `/api/surveys/[id]/responses` | 응답 목록 (인증) |
| GET | `/api/surveys/[id]/responses/export` | CSV 내보내기 (인증) |
| POST | `/api/surveys/[id]/sync-sheets` | Sheets 동기화 (인증) |
| GET | `/api/public/surveys/[slug]` | 공개 설문 조회 |
| POST | `/api/public/surveys/[slug]/responses` | 응답 제출 |

## 스크립트

```bash
pnpm dev           # 개발 서버
pnpm build         # 프로덕션 빌드
pnpm start         # 프로덕션 서버
pnpm lint          # ESLint 실행
pnpm test          # 단위 테스트 (27개)
pnpm test:coverage # 테스트 커버리지
pnpm test:e2e      # E2E 테스트
pnpm typecheck     # 타입 체크
pnpm db:push       # 스키마 적용
pnpm db:studio     # Drizzle Studio
```

## 테스트

```bash
# 단위 테스트 실행
pnpm test

# 커버리지 포함
pnpm test:coverage

# E2E 테스트
pnpm test:e2e
```

## 데이터베이스 스키마

```
users (id, email, name, image, created_at, updated_at)
  │
  └── surveys (id, user_id, title, slug, status, theme, logo_base64, sheets_config)
        │
        ├── questions (id, survey_id, type, title, options, required, order)
        │
        └── responses (id, survey_id, answers_json, completed_at, ip_address)
```

### 질문 유형

- `short_text`: 단답형 (255자)
- `long_text`: 장문형 (2000자)
- `multiple_choice`: 객관식 (2-10개 옵션)
- `yes_no`: 예/아니오
- `rating`: 별점 (1-5)

## 라이선스

MIT
