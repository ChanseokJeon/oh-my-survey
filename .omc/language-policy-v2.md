# Oh-My-Survey 언어 정책 기획안 v2.0

**작성일:** 2026-01-31
**상태:** 리뷰 반영 개정판

---

## 1. 개요

### 1.1 배경
- 현재 상태: 100% 영어 하드코딩, i18n 인프라 없음
- 목표: 한국어(ko) + 영어(en) 우선 지원

### 1.2 네 가지 언어 차원

| 차원 | 설명 | 저장 위치 | 기본값 |
|------|------|----------|--------|
| **UI Language** | 대시보드, 버튼, 에러 | `users.preferred_language` | 브라우저 감지 |
| **AI Output** | AI 생성 설문 | 프롬프트 언어 따름 | - |
| **Survey Content** | 질문, 선택지 | `surveys.language` | AI 감지 또는 명시 선택 |
| **Respondent UI** | 응답 페이지 버튼 | 설문 언어 따름 | `surveys.language` |

---

## 2. 핵심 원칙 (개정)

### 원칙 1: UI 언어와 설문 언어는 독립적
- 한국어 UI로 영어 설문 생성 가능
- 영어 UI로 한국어 설문 생성 가능

### 원칙 2: AI는 입력 언어를 따르되 명시 우선
- 언어 드롭다운 선택 시 → 해당 언어로 생성
- 드롭다운 "자동" 선택 시 → 프롬프트 언어 감지

### 원칙 3: 응답자 경험은 설문 언어로 통일 ⚠️ 확정
- 질문, 선택지, 버튼(이전/다음/제출), 완료 메시지
- 모두 `surveys.language` 따름
- 일관성이 혼란보다 나음

### 원칙 4: 수동 편집은 설문 언어 유지
- AI 재생성 지시가 다른 언어여도 설문 언어로 출력
- 예: 한국어 설문에서 영어로 "Make it shorter" → 한국어로 수정됨

---

## 3. 기술 설계 (개정)

### 3.1 데이터베이스 스키마 (Drizzle ORM)

```typescript
// src/lib/db/schema.ts 추가

export const languageEnum = pgEnum('language', ['en', 'ko']);

// users 테이블 수정
export const users = pgTable('users', {
  // ... 기존 필드
  preferredLanguage: languageEnum('preferred_language'), // NULL = 브라우저 감지
});

// surveys 테이블 수정
export const surveys = pgTable('surveys', {
  // ... 기존 필드
  language: languageEnum('language').notNull().default('en'),
});

// responses 테이블 수정 (분석용)
export const responses = pgTable('responses', {
  // ... 기존 필드
  respondentLocale: varchar('respondent_locale', { length: 10 }), // 응답자 브라우저 언어
});
```

**마이그레이션:**
```bash
pnpm drizzle-kit generate
pnpm drizzle-kit push
```

### 3.2 폰트 설정 ⚠️ 확정

**문제:** Inter 폰트는 한글 미지원 (`subsets: ["latin"]`)

**해결:**
```typescript
// src/app/layout.tsx
import { Inter } from 'next/font/google';
import localFont from 'next/font/local';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const pretendard = localFont({
  src: '../fonts/PretendardVariable.woff2',
  variable: '--font-pretendard',
  display: 'swap',
});

// body에 적용
<body className={`${inter.variable} ${pretendard.variable} font-sans`}>
```

```css
/* tailwind.config.js */
fontFamily: {
  sans: ['var(--font-pretendard)', 'var(--font-inter)', 'sans-serif'],
}
```

### 3.3 i18n 전략 ⚠️ 변경: 직접 구현

**이유:**
- next-intl + NextAuth 미들웨어 충돌 위험
- MVP 범위에서 복잡한 라이브러리 불필요
- 2개 언어만 지원

**구현:**
```typescript
// src/lib/i18n/index.ts
export const translations = {
  en: {
    dashboard: { title: 'Surveys', newSurvey: 'New Survey', ... },
    survey: { previous: 'Previous', next: 'Next', submit: 'Submit', ... },
    errors: { required: 'This field is required', ... },
  },
  ko: {
    dashboard: { title: '설문조사', newSurvey: '새 설문', ... },
    survey: { previous: '이전', next: '다음', submit: '제출', ... },
    errors: { required: '필수 입력 항목입니다', ... },
  },
};

// Context Provider
export function useTranslation() {
  const { language } = useLanguageContext();
  return (key: string) => get(translations[language], key) || key;
}
```

### 3.4 AI 언어 처리 (개정)

**시스템 프롬프트 수정:**
```typescript
// src/lib/ai/survey-generator.ts
function buildSystemPrompt(targetLanguage?: 'en' | 'ko'): string {
  const languageInstruction = targetLanguage
    ? `IMPORTANT: Generate ALL survey content in ${targetLanguage === 'ko' ? 'Korean (한국어)' : 'English'}. This is a hard requirement.`
    : `IMPORTANT: Detect the language of the user's input and generate the survey in that SAME language. If Korean, respond in Korean. If English, respond in English.`;

  return `You are a survey design expert.
${languageInstruction}

... (기존 프롬프트 내용)
`;
}
```

**API 변경:**
```typescript
// POST /api/ai/generate
interface GenerateRequest {
  description: string;
  targetLanguage?: 'en' | 'ko' | 'auto'; // 새 필드
}
```

**언어 감지 개선:**
```typescript
function detectLanguage(text: string): 'ko' | 'en' {
  // 한글/영어 문자만 추출 (숫자, 공백, 특수문자 제외)
  const koreanChars = text.match(/[\uAC00-\uD7AF]/g) || [];
  const englishChars = text.match(/[a-zA-Z]/g) || [];

  const total = koreanChars.length + englishChars.length;
  if (total === 0) return 'en'; // 기본값

  const koreanRatio = koreanChars.length / total;
  return koreanRatio > 0.3 ? 'ko' : 'en';
}
```

### 3.5 슬러그 정책 ⚠️ 확정

**결정:** ASCII 슬러그만 허용 (안전성 우선)

```typescript
// 한글 제목 → romanized slug
"고객 만족도 설문" → "gogaek-manjokdo-seolmun"
// 또는 timestamp 기반
"고객 만족도 설문" → "survey-1706659200000"
```

---

## 4. 사용자 시나리오 (개정)

### 시나리오 A: 첫 방문 한국인 사용자
1. 로그인 → 브라우저 `Accept-Language: ko` 감지
2. `users.preferred_language = NULL` → UI는 한국어로 표시
3. 설정에서 명시적으로 언어 선택 시 DB 저장

### 시나리오 B: AI 설문 생성 (자동 감지)
1. 언어 드롭다운: "자동 감지" 선택 (기본값)
2. 프롬프트: "카페 만족도 설문 만들어줘"
3. 감지: 한국어 > 30% → `targetLanguage = 'ko'`
4. AI 생성: 한국어 설문
5. 저장: `surveys.language = 'ko'`

### 시나리오 C: AI 설문 생성 (명시적 선택)
1. 언어 드롭다운: "English" 선택
2. 프롬프트: "카페 만족도 설문 만들어줘" (한국어)
3. AI: 영어로 설문 생성 (프롬프트 언어 무시)
4. 저장: `surveys.language = 'en'`

### 시나리오 D: 혼합 언어 프롬프트 (자동 감지)
1. 드롭다운: "자동 감지"
2. 프롬프트: "Create a survey about 직장 satisfaction"
3. 감지: 한국어 ~15% < 30% → `en`
4. **확인 UI 표시:** "영어로 생성됩니다. 한국어를 원하시면 변경하세요."
5. 사용자 확인 또는 변경

### 시나리오 E: 수동 설문 생성
1. "새 설문" 클릭 (AI 미사용)
2. 제목 입력: "고객 만족도 조사"
3. 언어 감지 적용 → `surveys.language = 'ko'`
4. 또는 설정에서 명시적 언어 선택

### 시나리오 F: 응답자 경험
1. 영어 브라우저 사용자가 한국어 설문 접속
2. `<html lang="ko">` 설정
3. 질문, 버튼("이전", "다음", "제출"), 완료 메시지 모두 한국어
4. `responses.respondent_locale = 'en'` 저장 (분석용)

---

## 5. UI 명세

### 5.1 언어 설정 위치
- **헤더 우측:** 현재 언어 표시 (예: "KO" / "EN")
- **클릭 시:** 드롭다운으로 언어 변경
- **설정 페이지:** "언어 설정" 섹션에서도 변경 가능

### 5.2 AI 생성 다이얼로그
```
┌─────────────────────────────────────┐
│ AI로 설문 생성                        │
├─────────────────────────────────────┤
│ 설문 설명:                           │
│ ┌─────────────────────────────────┐ │
│ │                                 │ │
│ └─────────────────────────────────┘ │
│                                     │
│ 생성 언어: [자동 감지 ▼]              │
│           ├─ 자동 감지               │
│           ├─ 한국어                  │
│           └─ English               │
│                                     │
│ ⓘ 자동 감지: 입력 언어를 분석하여      │
│   해당 언어로 설문을 생성합니다.        │
│                                     │
│         [취소]  [생성하기]            │
└─────────────────────────────────────┘
```

### 5.3 혼합 언어 경고 (자동 감지 시)
```
┌─────────────────────────────────────┐
│ ⚠️ 언어 확인                         │
│                                     │
│ 영어로 생성됩니다.                    │
│ 한국어 설문을 원하시면 변경해주세요.    │
│                                     │
│   [한국어로 변경]  [영어로 계속]       │
└─────────────────────────────────────┘
```

---

## 6. 에러 메시지 정책 ⚠️ 확정

| 상황 | 언어 | 예시 |
|------|------|------|
| 대시보드 에러 | UI 언어 | "설문을 불러올 수 없습니다" |
| 설문 응답 에러 | 설문 언어 | "필수 항목입니다" |
| API 에러 (로그인 필요) | UI 언어 | "로그인이 필요합니다" |
| 시스템 에러 | 영어 | "Internal Server Error" |

---

## 7. 기존 데이터 마이그레이션

```typescript
// scripts/migrate-language.ts
async function migrateExistingData() {
  // 1. 기존 사용자: preferred_language = NULL (브라우저 감지)
  // 기본값이 NULL이므로 별도 처리 불필요

  // 2. 기존 설문: 제목으로 언어 감지
  const surveys = await db.select().from(surveysTable);
  for (const survey of surveys) {
    const detectedLang = detectLanguage(survey.title);
    await db.update(surveysTable)
      .set({ language: detectedLang })
      .where(eq(surveysTable.id, survey.id));
  }
}
```

---

## 8. MVP 범위 (확정)

### 포함
- [x] UI 언어 설정 (en/ko) - Context 기반
- [x] AI 생성 언어 선택 드롭다운
- [x] 설문 언어 저장 및 응답 페이지 적용
- [x] 폰트: Pretendard + Inter
- [x] 에러 메시지 다국어화
- [x] 기존 데이터 마이그레이션

### 제외
- ❌ URL 로케일 라우팅 (/en, /ko)
- ❌ 설문 다중 언어 버전
- ❌ 자동 번역 기능
- ❌ RTL 언어 지원
- ❌ 3개 이상 언어 지원

---

## 9. 구현 로드맵 (현실적)

### Phase 1: 인프라 (3-4일)
- Drizzle 스키마 수정 및 마이그레이션
- Pretendard 폰트 설치
- 번역 파일 구조 및 Context 생성

### Phase 2: UI 번역 (4-5일)
- 모든 하드코딩 문자열 추출
- 번역 적용 (약 50개 컴포넌트)
- 언어 선택 UI 추가

### Phase 3: AI 통합 (2-3일)
- 시스템 프롬프트 수정
- 언어 드롭다운 추가
- 혼합 언어 경고 UI

### Phase 4: 테스트 (2일)
- 한국어/영어 전환 테스트
- AI 생성 언어 테스트
- 응답자 경험 테스트

**총 예상: 2주**

---

## 10. 검증 기준

| 시나리오 | 검증 방법 |
|----------|----------|
| 한국어 UI | 대시보드에서 모든 버튼/레이블 한국어 확인 |
| AI 한국어 생성 | "설문 만들어줘" → 제목/질문 모두 한국어 |
| AI 영어 명시 | 드롭다운 English + 한국어 프롬프트 → 영어 설문 |
| 응답자 일관성 | 한국어 설문 → 버튼도 "이전/다음/제출" |
| 에러 메시지 | 한국어 설문 응답 시 "필수 항목입니다" |

---

**승인 대기 중**
