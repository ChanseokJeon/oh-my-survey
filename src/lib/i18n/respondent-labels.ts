export const respondentLabels = {
  en: {
    previous: 'Previous',
    next: 'Next',
    submit: 'Submit',
    thankYou: 'Thank you!',
    responseRecorded: 'Your response has been recorded.',
    submitAnother: 'Submit another response',
    pressEnter: 'Press Enter to continue',
    required: 'Required',
    placeholder: 'Type your answer...',
    placeholderLong: 'Type your answer...',
    questionOf: 'Question {current} of {total}',
    yes: 'Yes',
    no: 'No',
  },
  ko: {
    previous: '이전',
    next: '다음',
    submit: '제출',
    thankYou: '감사합니다!',
    responseRecorded: '응답이 기록되었습니다.',
    submitAnother: '다른 응답 제출하기',
    pressEnter: 'Enter 키를 눌러 계속',
    required: '필수',
    placeholder: '답변을 입력하세요...',
    placeholderLong: '답변을 입력하세요...',
    questionOf: '질문 {current} / {total}',
    yes: '예',
    no: '아니오',
  },
} as const;

export type SurveyLanguage = keyof typeof respondentLabels;

export function getLabels(language: SurveyLanguage) {
  return respondentLabels[language] || respondentLabels.en;
}
