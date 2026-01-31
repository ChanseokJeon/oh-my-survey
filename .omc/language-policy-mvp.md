# Oh-My-Survey 언어 정책 MVP

**작성일:** 2026-01-31
**상태:** 확정 (최소 구현)

---

## 1. MVP 요구사항

> 사용자가 한국어 프롬프트로 한국어 설문을 생성하고, 한글이 올바르게 표시되어야 함.

---

## 2. 구현 범위 (4개 항목)

### 2.1 Pretendard 폰트 추가 (30분)

**목적:** 한글 텍스트가 올바르게 렌더링되도록 함

```typescript
// src/app/layout.tsx
import localFont from 'next/font/local';

const pretendard = localFont({
  src: '../fonts/PretendardVariable.woff2',
  variable: '--font-pretendard',
  display: 'swap',
});

// body className에 추가
<body className={`${inter.className} ${pretendard.variable}`}>
```

```javascript
// tailwind.config.js
fontFamily: {
  sans: ['var(--font-pretendard)', 'Inter', 'sans-serif'],
}
```

### 2.2 AI 프롬프트 언어 감지 (1시간)

**목적:** AI가 입력 언어에 맞춰 설문 생성

```typescript
// src/lib/ai/survey-generator.ts
const SYSTEM_PROMPT = `You are an expert survey designer.

IMPORTANT: Detect the language of the user's input and generate the survey in that SAME language.
- If the user writes in Korean (한국어), generate ALL content in Korean.
- If the user writes in English, generate ALL content in English.
- This includes the title, all questions, and all answer options.

...existing guidelines...
`;
```

### 2.3 surveys.language 컬럼 추가 (30분)

**목적:** 설문 언어를 저장하여 응답자 UI에 활용

```typescript
// src/lib/db/schema.ts
export const languageEnum = pgEnum('survey_language', ['en', 'ko']);

export const surveys = pgTable('surveys', {
  // ... 기존 필드
  language: languageEnum('language').default('en').notNull(),
});
```

### 2.4 응답자 버튼 번역 (2시간)

**목적:** 응답자 UI 버튼이 설문 언어에 맞게 표시

```typescript
// src/lib/i18n/respondent-labels.ts
export const respondentLabels = {
  en: {
    previous: 'Previous',
    next: 'Next',
    submit: 'Submit',
    thankYou: 'Thank you!',
    responseRecorded: 'Your response has been recorded.',
    submitAnother: 'Submit another response',
    pressEnter: 'Press Enter to continue',
  },
  ko: {
    previous: '이전',
    next: '다음',
    submit: '제출',
    thankYou: '감사합니다!',
    responseRecorded: '응답이 기록되었습니다.',
    submitAnother: '다른 응답 제출하기',
    pressEnter: 'Enter 키를 눌러 계속',
  },
} as const;

export type SurveyLanguage = keyof typeof respondentLabels;
export type RespondentLabels = typeof respondentLabels[SurveyLanguage];
```

---

## 3. 제외 항목 (Post-MVP)

- ❌ UI 언어 선택기
- ❌ 사용자 언어 설정 (users.preferred_language)
- ❌ 브라우저 언어 감지
- ❌ 전체 UI 번역 (50+ 컴포넌트)
- ❌ 에러 메시지 지역화
- ❌ 혼합 언어 경고 다이얼로그
- ❌ URL 로케일 라우팅 (/en, /ko)
- ❌ 마이그레이션 스크립트 (기존 데이터)

---

## 4. 검증 기준

| 시나리오 | 예상 결과 |
|----------|----------|
| 한국어 프롬프트 | AI가 한국어 설문 생성 |
| 영어 프롬프트 | AI가 영어 설문 생성 |
| 한국어 설문 응답 페이지 | 버튼이 "이전/다음/제출" 표시 |
| 영어 설문 응답 페이지 | 버튼이 "Previous/Next/Submit" 표시 |

---

## 5. 예상 소요 시간

| 항목 | 시간 |
|------|------|
| Pretendard 폰트 | 30분 |
| AI 프롬프트 수정 | 1시간 |
| DB 스키마 변경 | 30분 |
| 응답자 버튼 번역 | 2시간 |
| **총계** | **4시간** |
