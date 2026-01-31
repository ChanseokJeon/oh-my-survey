/**
 * Unit tests for Survey Language Schema
 */

import { describe, it, expect } from 'vitest';
import { surveys, surveyLanguageEnum } from '@/lib/db/schema';

describe('Survey Language Schema', () => {
  describe('surveyLanguageEnum', () => {
    it('should be defined', () => {
      expect(surveyLanguageEnum).toBeDefined();
    });

    it('should have correct enum name', () => {
      expect(surveyLanguageEnum.enumName).toBe('survey_language');
    });

    it('should include "en" and "ko" values', () => {
      const values = surveyLanguageEnum.enumValues;
      expect(values).toContain('en');
      expect(values).toContain('ko');
      expect(values.length).toBe(2);
    });
  });

  describe('surveys table', () => {
    it('should have language column', () => {
      const columns = Object.keys(surveys);
      expect(columns).toContain('language');
    });
  });
});
