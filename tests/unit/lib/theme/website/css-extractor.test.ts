// tests/unit/lib/theme/website/css-extractor.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Page } from 'playwright-core';
import {
  cssColorToHex,
  cssVarsToColors,
  extractCSSVariables,
  type CSSVariables,
} from '../../../../../src/lib/theme/website/css-extractor';

vi.mock('playwright-core', () => ({
  Page: vi.fn(),
}));

describe('cssColorToHex', () => {
  describe('6-digit hex colors', () => {
    it('should return same value for valid 6-digit hex', () => {
      expect(cssColorToHex('#ff0000')).toBe('#ff0000');
      expect(cssColorToHex('#00FF00')).toBe('#00FF00');
      expect(cssColorToHex('#0000ff')).toBe('#0000ff');
      expect(cssColorToHex('#abcdef')).toBe('#abcdef');
      expect(cssColorToHex('#123456')).toBe('#123456');
    });

    it('should handle uppercase and lowercase', () => {
      expect(cssColorToHex('#FFFFFF')).toBe('#FFFFFF');
      expect(cssColorToHex('#ffffff')).toBe('#ffffff');
      expect(cssColorToHex('#AbCdEf')).toBe('#AbCdEf');
    });
  });

  describe('3-digit hex colors', () => {
    it('should expand 3-digit hex to 6-digit', () => {
      expect(cssColorToHex('#f00')).toBe('#ff0000');
      expect(cssColorToHex('#0f0')).toBe('#00ff00');
      expect(cssColorToHex('#00f')).toBe('#0000ff');
      expect(cssColorToHex('#abc')).toBe('#aabbcc');
      expect(cssColorToHex('#123')).toBe('#112233');
    });

    it('should handle uppercase 3-digit hex', () => {
      expect(cssColorToHex('#F00')).toBe('#FF0000');
      expect(cssColorToHex('#ABC')).toBe('#AABBCC');
    });
  });

  describe('RGB format', () => {
    it('should convert rgb() to hex', () => {
      expect(cssColorToHex('rgb(255, 0, 0)')).toBe('#ff0000');
      expect(cssColorToHex('rgb(0, 255, 0)')).toBe('#00ff00');
      expect(cssColorToHex('rgb(0, 0, 255)')).toBe('#0000ff');
      expect(cssColorToHex('rgb(171, 205, 239)')).toBe('#abcdef');
    });

    it('should handle rgb() without spaces', () => {
      expect(cssColorToHex('rgb(255,0,0)')).toBe('#ff0000');
      expect(cssColorToHex('rgb(128,64,32)')).toBe('#804020');
    });

    it('should handle rgb() with extra spaces', () => {
      expect(cssColorToHex('rgb(  255  ,  0  ,  0  )')).toBe('#ff0000');
    });

    it('should pad single-digit hex values', () => {
      expect(cssColorToHex('rgb(1, 2, 3)')).toBe('#010203');
      expect(cssColorToHex('rgb(0, 0, 0)')).toBe('#000000');
      expect(cssColorToHex('rgb(15, 15, 15)')).toBe('#0f0f0f');
    });
  });

  describe('RGBA format', () => {
    it('should convert rgba() to hex (ignoring alpha)', () => {
      expect(cssColorToHex('rgba(255, 0, 0, 1)')).toBe('#ff0000');
      expect(cssColorToHex('rgba(0, 255, 0, 0.5)')).toBe('#00ff00');
      expect(cssColorToHex('rgba(0, 0, 255, 0)')).toBe('#0000ff');
      expect(cssColorToHex('rgba(128, 128, 128, 0.75)')).toBe('#808080');
    });

    it('should handle rgba() without spaces', () => {
      expect(cssColorToHex('rgba(255,0,0,1)')).toBe('#ff0000');
    });

    it('should handle rgba() with extra spaces', () => {
      expect(cssColorToHex('rgba(  255  ,  0  ,  0  ,  1  )')).toBe('#ff0000');
    });
  });

  describe('invalid formats', () => {
    it('should return null for invalid hex colors', () => {
      expect(cssColorToHex('#gg0000')).toBe(null);
      expect(cssColorToHex('#12345')).toBe(null);
      expect(cssColorToHex('#1234567')).toBe(null);
      expect(cssColorToHex('ff0000')).toBe(null);
      expect(cssColorToHex('#')).toBe(null);
    });

    it('should return null for unsupported color formats', () => {
      expect(cssColorToHex('red')).toBe(null);
      expect(cssColorToHex('hsl(0, 100%, 50%)')).toBe(null);
      expect(cssColorToHex('hsla(0, 100%, 50%, 1)')).toBe(null);
      expect(cssColorToHex('oklch(0.5 0.2 180)')).toBe(null);
    });

    it('should return null for empty or invalid strings', () => {
      expect(cssColorToHex('')).toBe(null);
      expect(cssColorToHex('not-a-color')).toBe(null);
      expect(cssColorToHex('123')).toBe(null);
    });

    it('should return null for malformed rgb/rgba', () => {
      expect(cssColorToHex('rgb(255, 0)')).toBe(null);
      expect(cssColorToHex('rgb(255)')).toBe(null);
      expect(cssColorToHex('rgb(a, b, c)')).toBe(null);
    });
  });
});

describe('cssVarsToColors', () => {
  describe('prioritization', () => {
    it('should prioritize primary colors first', () => {
      const vars = {
        '--background': '#ffffff',
        '--primary': '#ff0000',
        '--text': '#000000',
      };
      const colors = cssVarsToColors(vars);
      expect(colors[0]).toBe('#ff0000');
    });

    it('should prioritize secondary colors second', () => {
      const vars = {
        '--background': '#ffffff',
        '--secondary': '#00ff00',
        '--primary': '#ff0000',
        '--text': '#000000',
      };
      const colors = cssVarsToColors(vars);
      expect(colors[0]).toBe('#ff0000');
      expect(colors[1]).toBe('#00ff00');
    });

    it('should prioritize accent colors third', () => {
      const vars = {
        '--background': '#ffffff',
        '--accent': '#0000ff',
        '--secondary': '#00ff00',
        '--primary': '#ff0000',
      };
      const colors = cssVarsToColors(vars);
      expect(colors[0]).toBe('#ff0000');
      expect(colors[1]).toBe('#00ff00');
      expect(colors[2]).toBe('#0000ff');
    });

    it('should handle case-insensitive priority matching', () => {
      const vars = {
        '--PRIMARY': '#ff0000',
        '--Secondary': '#00ff00',
        '--ACCENT': '#0000ff',
      };
      const colors = cssVarsToColors(vars);
      expect(colors[0]).toBe('#ff0000');
      expect(colors[1]).toBe('#00ff00');
      expect(colors[2]).toBe('#0000ff');
    });

    it('should prioritize based on full priority order', () => {
      const vars = {
        '--card': '#111111',
        '--muted': '#222222',
        '--border': '#333333',
        '--text': '#444444',
        '--surface': '#555555',
        '--foreground': '#666666',
        '--background': '#777777',
        '--accent': '#888888',
        '--secondary': '#999999',
        '--primary': '#aaaaaa',
      };
      const colors = cssVarsToColors(vars);
      // Priority order: primary, secondary, accent, background, foreground, surface, text, border, muted, card
      expect(colors[0]).toBe('#aaaaaa'); // primary
      expect(colors[1]).toBe('#999999'); // secondary
      expect(colors[2]).toBe('#888888'); // accent
      expect(colors[3]).toBe('#777777'); // background
      expect(colors[4]).toBe('#666666'); // foreground
      expect(colors[5]).toBe('#555555'); // surface
      expect(colors[6]).toBe('#444444'); // text
      expect(colors[7]).toBe('#333333'); // border
    });
  });

  describe('deduplication', () => {
    it('should deduplicate identical colors', () => {
      const vars = {
        '--primary': '#ff0000',
        '--primary-light': '#ff0000',
        '--primary-dark': '#ff0000',
        '--secondary': '#00ff00',
      };
      const colors = cssVarsToColors(vars);
      expect(colors.filter(c => c === '#ff0000').length).toBe(1);
      expect(colors).toContain('#ff0000');
      expect(colors).toContain('#00ff00');
    });

    it('should not include duplicate colors even from non-priority vars', () => {
      const vars = {
        '--primary': '#ff0000',
        '--random-color': '#ff0000',
        '--another-color': '#ff0000',
      };
      const colors = cssVarsToColors(vars);
      expect(colors.filter(c => c === '#ff0000').length).toBe(1);
    });
  });

  describe('limit to 8 colors', () => {
    it('should limit output to 8 colors max', () => {
      const vars = {
        '--color-1': '#111111',
        '--color-2': '#222222',
        '--color-3': '#333333',
        '--color-4': '#444444',
        '--color-5': '#555555',
        '--color-6': '#666666',
        '--color-7': '#777777',
        '--color-8': '#888888',
        '--color-9': '#999999',
        '--color-10': '#aaaaaa',
        '--color-11': '#bbbbbb',
        '--color-12': '#cccccc',
      };
      const colors = cssVarsToColors(vars);
      expect(colors).toHaveLength(8);
    });

    it('should include priority colors within the 8 limit', () => {
      const vars = {
        '--primary': '#ff0000',
        '--secondary': '#00ff00',
        '--accent': '#0000ff',
        '--color-1': '#111111',
        '--color-2': '#222222',
        '--color-3': '#333333',
        '--color-4': '#444444',
        '--color-5': '#555555',
        '--color-6': '#666666',
        '--color-7': '#777777',
      };
      const colors = cssVarsToColors(vars);
      expect(colors).toHaveLength(8);
      expect(colors[0]).toBe('#ff0000');
      expect(colors[1]).toBe('#00ff00');
      expect(colors[2]).toBe('#0000ff');
    });
  });

  describe('empty input handling', () => {
    it('should return empty array for empty vars object', () => {
      expect(cssVarsToColors({})).toEqual([]);
    });

    it('should skip invalid color values', () => {
      const vars = {
        '--primary': 'invalid',
        '--secondary': 'red',
        '--accent': '#ff0000',
      };
      const colors = cssVarsToColors(vars);
      expect(colors).toEqual(['#ff0000']);
    });

    it('should handle mix of valid and invalid colors', () => {
      const vars = {
        '--primary': '#ff0000',
        '--invalid-1': 'not-a-color',
        '--secondary': 'rgb(0, 255, 0)',
        '--invalid-2': 'hsl(0, 100%, 50%)',
        '--accent': '#00f',
      };
      const colors = cssVarsToColors(vars);
      expect(colors).toEqual(['#ff0000', '#00ff00', '#0000ff']);
    });
  });

  describe('RGB/RGBA color handling', () => {
    it('should convert RGB colors in vars', () => {
      const vars = {
        '--primary': 'rgb(255, 0, 0)',
        '--secondary': 'rgba(0, 255, 0, 0.5)',
      };
      const colors = cssVarsToColors(vars);
      expect(colors).toEqual(['#ff0000', '#00ff00']);
    });
  });
});

describe('extractCSSVariables', () => {
  let mockPage: Page;

  beforeEach(() => {
    mockPage = {
      evaluate: vi.fn(),
    } as unknown as Page;
  });

  describe('successful extraction', () => {
    it('should return found: true when CSS variables exist', async () => {
      const mockResult: CSSVariables = {
        found: true,
        colors: {
          '--primary': '#ff0000',
          '--secondary': '#00ff00',
        },
      };

      vi.mocked(mockPage.evaluate).mockResolvedValue(mockResult);

      const result = await extractCSSVariables(mockPage);

      expect(result.found).toBe(true);
      expect(result.colors).toEqual({
        '--primary': '#ff0000',
        '--secondary': '#00ff00',
      });
      expect(mockPage.evaluate).toHaveBeenCalledOnce();
    });

    it('should return found: false when no CSS variables', async () => {
      const mockResult: CSSVariables = {
        found: false,
        colors: {},
      };

      vi.mocked(mockPage.evaluate).mockResolvedValue(mockResult);

      const result = await extractCSSVariables(mockPage);

      expect(result.found).toBe(false);
      expect(result.colors).toEqual({});
    });

    it('should handle multiple CSS variables', async () => {
      const mockResult: CSSVariables = {
        found: true,
        colors: {
          '--primary': '#ff0000',
          '--secondary': '#00ff00',
          '--accent': '#0000ff',
          '--background': '#ffffff',
          '--foreground': '#000000',
        },
      };

      vi.mocked(mockPage.evaluate).mockResolvedValue(mockResult);

      const result = await extractCSSVariables(mockPage);

      expect(result.found).toBe(true);
      expect(Object.keys(result.colors)).toHaveLength(5);
    });
  });

  describe('error handling', () => {
    it('should handle page.evaluate errors gracefully', async () => {
      vi.mocked(mockPage.evaluate).mockRejectedValue(new Error('Page evaluation failed'));

      const result = await extractCSSVariables(mockPage);

      expect(result.found).toBe(false);
      expect(result.colors).toEqual({});
    });

    it('should handle timeout errors', async () => {
      vi.mocked(mockPage.evaluate).mockRejectedValue(new Error('Timeout'));

      const result = await extractCSSVariables(mockPage);

      expect(result.found).toBe(false);
      expect(result.colors).toEqual({});
    });

    it('should handle network errors', async () => {
      vi.mocked(mockPage.evaluate).mockRejectedValue(new Error('Network error'));

      const result = await extractCSSVariables(mockPage);

      expect(result.found).toBe(false);
      expect(result.colors).toEqual({});
    });

    it('should handle null/undefined errors', async () => {
      vi.mocked(mockPage.evaluate).mockRejectedValue(null);

      const result = await extractCSSVariables(mockPage);

      expect(result.found).toBe(false);
      expect(result.colors).toEqual({});
    });
  });

  describe('script execution', () => {
    it('should call page.evaluate with extraction script', async () => {
      const mockResult: CSSVariables = {
        found: true,
        colors: { '--primary': '#ff0000' },
      };

      vi.mocked(mockPage.evaluate).mockResolvedValue(mockResult);

      await extractCSSVariables(mockPage);

      expect(mockPage.evaluate).toHaveBeenCalledWith(expect.any(String));
      const callArg = vi.mocked(mockPage.evaluate).mock.calls[0][0] as string;
      expect(callArg).toContain('document.documentElement');
      expect(callArg).toContain('getComputedStyle');
      expect(callArg).toContain('--');
    });
  });
});
