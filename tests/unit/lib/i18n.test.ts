/**
 * Unit tests for i18n - Respondent Labels
 */

import { describe, it, expect } from 'vitest';
import { respondentLabels, getLabels, type SurveyLanguage } from '@/lib/i18n/respondent-labels';

describe('Respondent Labels', () => {
  describe('respondentLabels object', () => {
    it('should have English labels', () => {
      expect(respondentLabels.en).toBeDefined();
      expect(respondentLabels.en.previous).toBe('Previous');
      expect(respondentLabels.en.next).toBe('Next');
      expect(respondentLabels.en.submit).toBe('Submit');
      expect(respondentLabels.en.thankYou).toBe('Thank you!');
      expect(respondentLabels.en.responseRecorded).toBe('Your response has been recorded.');
      expect(respondentLabels.en.submitAnother).toBe('Submit another response');
      expect(respondentLabels.en.pressEnter).toBe('Press Enter to continue');
    });

    it('should have Korean labels', () => {
      expect(respondentLabels.ko).toBeDefined();
      expect(respondentLabels.ko.previous).toBe('이전');
      expect(respondentLabels.ko.next).toBe('다음');
      expect(respondentLabels.ko.submit).toBe('제출');
      expect(respondentLabels.ko.thankYou).toBe('감사합니다!');
      expect(respondentLabels.ko.responseRecorded).toBe('응답이 기록되었습니다.');
      expect(respondentLabels.ko.submitAnother).toBe('다른 응답 제출하기');
      expect(respondentLabels.ko.pressEnter).toBe('Enter 키를 눌러 계속');
    });

    it('should have matching keys for all languages', () => {
      const enKeys = Object.keys(respondentLabels.en).sort();
      const koKeys = Object.keys(respondentLabels.ko).sort();
      expect(enKeys).toEqual(koKeys);
    });
  });

  describe('getLabels function', () => {
    it('should return English labels for "en"', () => {
      const labels = getLabels('en');
      expect(labels).toBe(respondentLabels.en);
      expect(labels.next).toBe('Next');
    });

    it('should return Korean labels for "ko"', () => {
      const labels = getLabels('ko');
      expect(labels).toBe(respondentLabels.ko);
      expect(labels.next).toBe('다음');
    });

    it('should fall back to English for unknown language', () => {
      // TypeScript would prevent this, but testing runtime behavior
      const labels = getLabels('fr' as SurveyLanguage);
      expect(labels).toBe(respondentLabels.en);
    });
  });

  describe('SurveyLanguage type', () => {
    it('should only allow valid language codes', () => {
      const validLanguages: SurveyLanguage[] = ['en', 'ko'];
      validLanguages.forEach(lang => {
        expect(getLabels(lang)).toBeDefined();
      });
    });
  });
});
