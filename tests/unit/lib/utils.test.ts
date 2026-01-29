import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';
import { generateSlug } from '@/lib/utils/slug';

describe('cn utility', () => {
  it('should merge class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('should handle conditional classes', () => {
    expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz');
  });

  it('should merge Tailwind classes correctly', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
  });
});

describe('generateSlug', () => {
  it('should create slug from title', () => {
    const slug = generateSlug('My Survey Title');
    expect(slug).toMatch(/^my-survey-title-[a-zA-Z0-9_-]{8}$/);
  });

  it('should handle special characters', () => {
    const slug = generateSlug('Survey! @#$% Test');
    // slugify converts special chars to words ($ -> dollar, % -> percent)
    expect(slug).toMatch(/^[a-z0-9-]+-[a-zA-Z0-9_-]{8}$/);
    expect(slug).toContain('survey');
    expect(slug).toContain('test');
  });

  it('should generate unique slugs', () => {
    const slug1 = generateSlug('Test');
    const slug2 = generateSlug('Test');
    expect(slug1).not.toBe(slug2);
  });
});
