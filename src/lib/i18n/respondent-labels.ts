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

export function getLabels(language: SurveyLanguage) {
  return respondentLabels[language] || respondentLabels.en;
}
