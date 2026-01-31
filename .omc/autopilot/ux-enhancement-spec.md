# Oh-My-Survey UX Enhancement Specification

## Executive Summary

Four feature groups: Tab Navigation, Google Sheets Wizard, LLM Survey Generator, UX Enhancements.

---

## Feature 1: Tab Navigation System

### Problem
Edit/Settings/Responses 페이지가 분리되어 있어 네비게이션이 불편함.

### Solution
Survey-level layout with URL-based tabs.

### Files
```
src/app/(dashboard)/surveys/[surveyId]/
├── layout.tsx                    # NEW: 공통 레이아웃
├── page.tsx                      # NEW: /edit로 리다이렉트
├── edit/page.tsx                 # MODIFY
├── settings/page.tsx             # MODIFY
└── responses/page.tsx            # MODIFY

src/components/survey/
└── survey-layout-header.tsx      # NEW: 탭 + 브레드크럼

src/contexts/
└── survey-context.tsx            # NEW: Survey 데이터 공유
```

### Visual
```
┌─────────────────────────────────────────────────────────┐
│ ← Dashboard / Customer Satisfaction Survey     [Badge] │
│ ─────────────────────────────────────────────────────── │
│   Edit    Settings    Responses                        │
│   ════                                                  │
└─────────────────────────────────────────────────────────┘
```

---

## Feature 2: Google Sheets Setup Wizard

### Problem
Spreadsheet ID 입력만 있고 설정 가이드 없음.

### Solution
4단계 위저드 다이얼로그.

### Steps
1. **Create Spreadsheet** - Google Sheets 생성 안내
2. **Extract ID** - URL에서 ID 자동 추출
3. **Share** - 서비스 계정 이메일 공유 안내
4. **Test** - 연결 테스트

### Files
```
src/components/survey/sheets-setup-wizard/
├── index.tsx              # 메인 위저드
├── step-create.tsx        # 1단계
├── step-extract-id.tsx    # 2단계
├── step-share.tsx         # 3단계
└── step-test.tsx          # 4단계

src/app/api/
├── config/sheets/route.ts           # NEW: 서비스 계정 정보
└── surveys/[surveyId]/test-sheets/route.ts  # NEW: 연결 테스트
```

### ID Extraction Logic
```typescript
function extractSpreadsheetId(input: string): string | null {
  if (/^[\w-]+$/.test(input) && input.length > 20) return input;
  const match = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match?.[1] ?? null;
}
```

---

## Feature 3: LLM Survey Generator

### Problem
설문지 작성이 수동으로만 가능.

### Solution
자연어 입력 → AI가 설문 구조 생성.

### Files
```
src/lib/ai/
├── client.ts              # Anthropic 클라이언트
└── survey-generator.ts    # 생성 로직 + 프롬프트

src/app/api/surveys/generate/route.ts  # NEW

src/components/survey/ai-generator/
├── index.tsx              # 메인 다이얼로그
├── input-step.tsx         # 설명 입력
└── preview-step.tsx       # 미리보기 + 편집
```

### Prompt Design
```typescript
const SYSTEM_PROMPT = `You are a survey design expert. Generate professional surveys.

Output JSON:
{
  "title": "string (max 200 chars)",
  "questions": [{
    "type": "short_text" | "long_text" | "multiple_choice" | "yes_no" | "rating",
    "title": "string",
    "options": ["string"] | null,
    "required": boolean
  }]
}

Guidelines:
- 5-15 questions typically
- Mix question types
- Required only for essential questions`;
```

### Flow
```
사용자: "고객 만족도 설문 만들어줘. 서비스 품질, 추천 의향 포함"
    ↓
AI 생성: { title: "고객 만족도 설문", questions: [...] }
    ↓
미리보기에서 수정 가능
    ↓
저장 → 설문 생성 완료
```

---

## Feature 4: UX Enhancements

### 4.1 Character Counters
```
src/components/ui/input-with-counter.tsx  # NEW

// Visual:
// ┌────────────────────────────────────┐
// │ Survey title here...               │
// └────────────────────────────────────┘
//                              45 / 200
```

### 4.2 Theme Preview
```
src/components/survey/theme-preview.tsx  # NEW

// 테마 선택 시 실시간 미리보기 표시
```

### 4.3 Draft Preview
```
// edit/page.tsx 수정
// 발행 전에도 미리보기 버튼 표시
// ?preview=true 쿼리로 접근
```

### 4.4 Unsaved Changes
```
src/hooks/use-unsaved-changes.ts  # NEW

// beforeunload 이벤트로 경고
// 헤더에 변경사항 표시 dot
```

### 4.5 Better Errors
```
src/components/ui/error-display.tsx  # NEW

// 구체적 에러 메시지 + 해결 액션
```

---

## Environment Variables

```env
# NEW - LLM Generator
ANTHROPIC_API_KEY=sk-ant-...

# EXISTING - Google Sheets
GOOGLE_SHEETS_CLIENT_EMAIL=...
GOOGLE_SHEETS_PRIVATE_KEY=...
```

---

## Implementation Phases

### Phase 1: Tab Navigation (Foundation)
1. survey-context.tsx 생성
2. survey-layout-header.tsx 생성
3. [surveyId]/layout.tsx 생성
4. 기존 페이지 리팩터링

### Phase 2: UX Enhancements
1. input-with-counter.tsx
2. use-unsaved-changes.ts
3. 드래프트 미리보기 버튼
4. error-display.tsx

### Phase 3: Google Sheets Wizard
1. /api/config/sheets 엔드포인트
2. /api/surveys/[id]/test-sheets 엔드포인트
3. 위저드 컴포넌트 4개
4. Settings 페이지 연동

### Phase 4: LLM Generator
1. Anthropic 클라이언트 설정
2. /api/surveys/generate 엔드포인트
3. AI Generator 다이얼로그
4. 대시보드/새 설문 페이지 연동

---

## Success Criteria

1. **Tab Navigation**: URL 기반 탭 전환, 브레드크럼 표시
2. **Sheets Wizard**: 4단계 완료 시 연결 테스트 성공
3. **LLM Generator**: 텍스트 입력 → 설문 생성 → 저장 플로우
4. **UX**: 글자 수 표시, 미저장 경고, 에러 메시지 개선
