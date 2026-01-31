# Oh-My-Survey 언어 정책 기획안 (초안)

## 1. 개요

### 1.1 배경
- 현재 상태: 100% 영어 하드코딩, i18n 인프라 없음
- 테스트 데이터에 한국어 케이스 존재 (의도된 지원)
- 목표: 한국어 + 영어 지원

### 1.2 세 가지 언어 차원

| 차원 | 설명 | 예시 |
|------|------|------|
| **UI Language** | 사이트 인터페이스 | Dashboard, 버튼, 에러 메시지 |
| **AI Language** | LLM 입출력 | 프롬프트 → 생성된 설문 |
| **Survey Language** | 설문 콘텐츠 | 질문, 선택지, 완료 메시지 |

## 2. 핵심 원칙

### 원칙 1: UI 언어와 설문 언어는 독립적
- 한국어 UI로 영어 설문 생성 가능
- 영어 UI로 한국어 설문 생성 가능

### 원칙 2: AI는 입력 언어를 따름
- 한국어 프롬프트 → 한국어 설문 생성
- 영어 프롬프트 → 영어 설문 생성
- 명시적 언어 지정 시 해당 언어로 생성

### 원칙 3: 설문은 생성 언어로 고정
- 설문 콘텐츠는 생성된 언어로 저장
- 응답자도 해당 언어로 설문 확인
- UI 버튼(이전/다음)은 응답자 언어 가능

## 3. 구현 설계

### 3.1 데이터베이스 스키마

```sql
-- users 테이블 추가
ALTER TABLE users ADD COLUMN preferred_language VARCHAR(10) DEFAULT 'en';

-- surveys 테이블 추가
ALTER TABLE surveys ADD COLUMN language VARCHAR(10) DEFAULT 'en';
```

### 3.2 UI 언어 처리

**저장 위치:**
- 로그인 사용자: `users.preferred_language`
- 비로그인: 브라우저 `Accept-Language` → 쿠키

**변경 방법:**
- 설정 페이지의 언어 선택 드롭다운
- 즉시 적용 (페이지 새로고침 필요 없음)

**지원 언어:**
- Phase 1: 영어(en), 한국어(ko)
- Phase 2: 추가 언어 확장 가능

### 3.3 AI 언어 처리

**현재 시스템 프롬프트 (영어 고정):**
```typescript
const SYSTEM_PROMPT = `You are a survey design expert...`
```

**개선된 시스템 프롬프트:**
```typescript
const SYSTEM_PROMPT = `You are a survey design expert.
IMPORTANT: Generate all survey content in the SAME LANGUAGE as the user's input.
If the user writes in Korean, respond entirely in Korean.
If the user writes in English, respond entirely in English.
...`
```

**명시적 언어 지정 옵션:**
- AI 생성 다이얼로그에 "생성 언어" 드롭다운 추가
- 선택 시: "Generate this survey in Korean regardless of prompt language"

### 3.4 설문 언어 처리

**저장:**
- `surveys.language` 필드에 언어 코드 저장
- AI 생성 시 자동 감지 또는 명시적 선택

**표시:**
- 설문 응답 페이지: 설문 언어로 질문/선택지 표시
- 네비게이션 버튼: 설문 언어 따름 (일관성 유지)
- 완료 메시지: 설문 언어 따름

### 3.5 언어 감지 로직

```typescript
function detectLanguage(text: string): 'ko' | 'en' {
  // 한글 문자 비율로 감지
  const koreanChars = text.match(/[\uAC00-\uD7AF]/g) || [];
  const ratio = koreanChars.length / text.length;
  return ratio > 0.3 ? 'ko' : 'en';
}
```

## 4. 사용자 시나리오

### 시나리오 A: 한국인 사용자, 한국어 설문 생성
1. 로그인 → UI 언어: 한국어 (기본값 또는 설정)
2. "AI로 설문 생성" 클릭
3. 한국어 프롬프트 입력: "카페 만족도 설문 만들어줘"
4. AI가 한국어 설문 생성
5. `surveys.language = 'ko'` 저장
6. 응답자: 한국어로 설문 확인 및 응답

### 시나리오 B: 한국인 사용자, 영어 설문 생성
1. 로그인 → UI 언어: 한국어
2. "AI로 설문 생성" 클릭
3. 영어 프롬프트 입력: "Create a customer satisfaction survey"
4. AI가 영어 설문 생성
5. `surveys.language = 'en'` 저장
6. 응답자: 영어로 설문 확인 및 응답

### 시나리오 C: 혼합 언어 프롬프트
1. 프롬프트: "Create a survey about 직장 satisfaction"
2. 시스템: 언어 선택 UI 표시 (또는 영어 기본값 적용)
3. 사용자 선택에 따라 생성

## 5. MVP 범위

### 포함 (In Scope)
- [ ] UI 언어 설정 (en/ko)
- [ ] AI 프롬프트 언어 자동 감지
- [ ] 설문 언어 저장 및 표시
- [ ] 기본 번역 파일 (버튼, 레이블)

### 제외 (Out of Scope)
- ❌ URL 기반 로케일 라우팅 (/en, /ko)
- ❌ 설문 다중 언어 버전
- ❌ 자동 번역 기능
- ❌ RTL 언어 지원
- ❌ 복수형/문법 처리

## 6. 기술 스택 결정

### 옵션 A: next-intl (권장)
- App Router 네이티브 지원
- Server Components 완벽 호환
- 2025년 Next.js 생태계 표준

### 옵션 B: 직접 구현
- 간단한 JSON 번역 파일
- Context Provider로 언어 상태 관리
- MVP에 충분할 수 있음

**결정: next-intl 채택**
- 향후 확장성 고려
- 커뮤니티 지원 및 문서화

## 7. 구현 로드맵

### Phase 1: 인프라 (1주)
- next-intl 설치 및 설정
- 번역 파일 구조 생성
- 미들웨어 설정

### Phase 2: UI 번역 (1주)
- 대시보드, 로그인, 설정 페이지 번역
- 언어 선택 UI 추가
- 사용자 설정 저장

### Phase 3: AI 통합 (1주)
- 시스템 프롬프트 수정
- 언어 감지 로직 구현
- 설문 언어 필드 추가

## 8. 열린 질문

1. 폰트: Inter가 한글 지원하는가? Pretendard 추가 필요?
2. 슬러그: 한글 슬러그 허용할 것인가?
3. 에러 메시지: API 에러도 다국어화할 것인가?
4. CSV 내보내기: 헤더 언어는 UI 따를 것인가?

---

**작성일:** 2026-01-31
**상태:** 초안 - 리뷰 대기
