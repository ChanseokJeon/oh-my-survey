import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractWebsiteTheme } from '@/lib/theme/website/index';
import type { WebsiteThemeResult } from '@/lib/theme/website/index';
import type { ThemeColors } from '@/lib/theme/types';
import type { Browser, Page } from 'playwright-core';

// Create hoisted mock functions
const mockValidateAndResolveUrl = vi.hoisted(() => vi.fn());
const mockLaunchSecureBrowser = vi.hoisted(() => vi.fn());
const mockCreateSecurePage = vi.hoisted(() => vi.fn());
const mockExtractCSSVariables = vi.hoisted(() => vi.fn());
const mockCssVarsToColors = vi.hoisted(() => vi.fn());
const mockExtractDOMColors = vi.hoisted(() => vi.fn());
const mockMergeColors = vi.hoisted(() => vi.fn());
const mockMergeColorsHueBinningFirst = vi.hoisted(() => vi.fn());
const mockFilterGrayscale = vi.hoisted(() => vi.fn());
const mockCaptureScreenshot = vi.hoisted(() => vi.fn());
const mockExtractColors = vi.hoisted(() => vi.fn());
const mockExtractColorsHueBinning = vi.hoisted(() => vi.fn());
const mockGenerateTheme = vi.hoisted(() => vi.fn());

// Mock all dependencies
vi.mock('@/lib/theme/website/validator', () => ({
  validateAndResolveUrl: mockValidateAndResolveUrl,
}));

vi.mock('@/lib/theme/website/browser', () => ({
  launchSecureBrowser: mockLaunchSecureBrowser,
  createSecurePage: mockCreateSecurePage,
}));

vi.mock('@/lib/theme/website/css-extractor', () => ({
  extractCSSVariables: mockExtractCSSVariables,
  cssVarsToColors: mockCssVarsToColors,
}));

vi.mock('@/lib/theme/website/dom-correlator', () => ({
  extractDOMColors: mockExtractDOMColors,
}));

vi.mock('@/lib/theme/website/color-merger', () => ({
  mergeColors: mockMergeColors,
  mergeColorsHueBinningFirst: mockMergeColorsHueBinningFirst,
  filterGrayscale: mockFilterGrayscale,
}));

vi.mock('@/lib/theme/website/screenshot', () => ({
  captureScreenshot: mockCaptureScreenshot,
}));

vi.mock('@/lib/theme/extractor', () => ({
  extractColors: mockExtractColors,
  extractColorsHueBinning: mockExtractColorsHueBinning,
}));

vi.mock('@/lib/theme/generator', () => ({
  generateTheme: mockGenerateTheme,
}));

describe('extractWebsiteTheme', () => {
  let mockBrowser: Browser;
  let mockPage: Page;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock browser and page with required methods
    mockBrowser = {
      close: vi.fn().mockResolvedValue(undefined),
      newContext: vi.fn(),
      isConnected: vi.fn().mockReturnValue(true),
    } as unknown as Browser;

    mockPage = {
      goto: vi.fn().mockResolvedValue(undefined),
      screenshot: vi.fn(),
      evaluate: vi.fn(),
      close: vi.fn(),
    } as unknown as Page;

    // Default successful validation
    mockValidateAndResolveUrl.mockResolvedValue({
      url: 'https://example.com',
      resolvedIp: '93.184.216.34',
      hostname: 'example.com',
    });

    // Default successful browser launch
    mockLaunchSecureBrowser.mockResolvedValue(mockBrowser);
    mockCreateSecurePage.mockResolvedValue(mockPage);

    // Default mock for extractDOMColors
    mockExtractDOMColors.mockResolvedValue({
      logo: [],
      cta: [],
      navigation: [],
      headings: [],
      accent: [],
    });

    // Default mock for screenshot
    mockCaptureScreenshot.mockResolvedValue(Buffer.from('fake-screenshot'));

    // Default mock for extractColorsWithArea
    mockExtractColorsHueBinning.mockResolvedValue([
      { hex: '#3B82F6', area: 1000 },
      { hex: '#10B981', area: 800 },
      { hex: '#F59E0B', area: 600 },
    ]);

    // Default mock for filterGrayscale
    mockFilterGrayscale.mockImplementation((colors) => colors);

    // Default mock for mergeColorsVisionFirst
    mockMergeColorsHueBinningFirst.mockReturnValue(['#3B82F6', '#10B981', '#F59E0B']);
  });

  describe('Vision-first path', () => {
    it('should use vision-first when visual colors >= 2 after filtering', async () => {
      const cssColors = {
        '--primary': '#3B82F6',
        '--secondary': '#10B981',
        '--accent': '#F59E0B',
      };

      const visualColors = [
        { hex: '#3B82F6', area: 1000 },
        { hex: '#10B981', area: 800 },
        { hex: '#F59E0B', area: 600 },
      ];

      const palette = ['#3B82F6', '#10B981', '#F59E0B'];
      const theme: ThemeColors = {
        surveyPrimary: '221.2 83.2% 53.3%',
        surveyPrimaryFg: '0 0% 100%',
        surveyBg: '0 0% 100%',
        surveyFg: '222.2 84% 4.9%',
        surveyMuted: '210 40% 96.1%',
        surveyMutedFg: '215.4 16.3% 46.9%',
        surveyBorder: '214.3 31.8% 91.4%',
        surveyInput: '214.3 31.8% 91.4%',
        surveyCard: '0 0% 100%',
        surveyCardFg: '222.2 84% 4.9%',
      };

      mockExtractCSSVariables.mockResolvedValue({
        found: true,
        colors: cssColors,
      });

      mockExtractColorsHueBinning.mockResolvedValue(visualColors);
      mockFilterGrayscale.mockReturnValue(visualColors);
      mockMergeColorsHueBinningFirst.mockReturnValue(palette);
      mockGenerateTheme.mockReturnValue(theme);

      const result = await extractWebsiteTheme('https://example.com');

      expect(mockValidateAndResolveUrl).toHaveBeenCalledWith('https://example.com');
      expect(mockLaunchSecureBrowser).toHaveBeenCalledWith({
        timeout: 15000,
        viewport: { width: 1280, height: 720 },
        resolvedIp: '93.184.216.34',
        hostname: 'example.com',
      });
      expect(mockCreateSecurePage).toHaveBeenCalledWith(mockBrowser, {
        timeout: 15000,
        viewport: { width: 1280, height: 720 },
        resolvedIp: '93.184.216.34',
        hostname: 'example.com',
      });
      expect(mockPage.goto).toHaveBeenCalledWith('https://example.com', {
        timeout: 15000,
        waitUntil: 'networkidle',
      });
      expect(mockExtractCSSVariables).toHaveBeenCalledWith(mockPage);
      expect(mockExtractDOMColors).toHaveBeenCalledWith(mockPage);
      expect(mockCaptureScreenshot).toHaveBeenCalledWith(mockPage);
      expect(mockExtractColorsHueBinning).toHaveBeenCalled();
      expect(mockFilterGrayscale).toHaveBeenCalledWith(visualColors);
      expect(mockMergeColorsHueBinningFirst).toHaveBeenCalled();
      expect(mockGenerateTheme).toHaveBeenCalledWith(palette);
      expect(mockBrowser.close).toHaveBeenCalled();

      expect(result).toEqual({
        palette,
        suggestedTheme: theme,
        source: 'vision-first',
      } as WebsiteThemeResult);
    });

    it('should use vision-first when exactly 2 visual colors after filtering', async () => {
      const cssColors = {
        '--primary': '#3B82F6',
        '--secondary': '#10B981',
        '--background': '#FFFFFF',
      };

      const visualColors = [
        { hex: '#3B82F6', area: 1000 },
        { hex: '#10B981', area: 800 },
      ];

      const palette = ['#3B82F6', '#10B981', '#FFFFFF'];
      const theme: ThemeColors = {
        surveyPrimary: '221.2 83.2% 53.3%',
        surveyPrimaryFg: '0 0% 100%',
        surveyBg: '0 0% 100%',
        surveyFg: '222.2 84% 4.9%',
        surveyMuted: '210 40% 96.1%',
        surveyMutedFg: '215.4 16.3% 46.9%',
        surveyBorder: '214.3 31.8% 91.4%',
        surveyInput: '214.3 31.8% 91.4%',
        surveyCard: '0 0% 100%',
        surveyCardFg: '222.2 84% 4.9%',
      };

      mockExtractCSSVariables.mockResolvedValue({
        found: true,
        colors: cssColors,
      });

      mockExtractColorsHueBinning.mockResolvedValue(visualColors);
      mockFilterGrayscale.mockReturnValue(visualColors);
      mockMergeColorsHueBinningFirst.mockReturnValue(palette);
      mockGenerateTheme.mockReturnValue(theme);

      const result = await extractWebsiteTheme('https://example.com');

      expect(mockMergeColorsHueBinningFirst).toHaveBeenCalled();
      expect(mockCaptureScreenshot).toHaveBeenCalled();
      expect(result.source).toBe('vision-first');
    });

    it('should use vision-first when > 2 visual colors after filtering', async () => {
      const cssColors = {
        '--primary': '#3B82F6',
        '--secondary': '#10B981',
        '--accent': '#F59E0B',
        '--background': '#FFFFFF',
        '--foreground': '#000000',
      };

      const visualColors = [
        { hex: '#3B82F6', area: 1000 },
        { hex: '#10B981', area: 800 },
        { hex: '#F59E0B', area: 600 },
        { hex: '#8B5CF6', area: 400 },
      ];

      const palette = ['#3B82F6', '#10B981', '#F59E0B', '#FFFFFF', '#000000'];
      const theme: ThemeColors = {
        surveyPrimary: '221.2 83.2% 53.3%',
        surveyPrimaryFg: '0 0% 100%',
        surveyBg: '0 0% 100%',
        surveyFg: '222.2 84% 4.9%',
        surveyMuted: '210 40% 96.1%',
        surveyMutedFg: '215.4 16.3% 46.9%',
        surveyBorder: '214.3 31.8% 91.4%',
        surveyInput: '214.3 31.8% 91.4%',
        surveyCard: '0 0% 100%',
        surveyCardFg: '222.2 84% 4.9%',
      };

      mockExtractCSSVariables.mockResolvedValue({
        found: true,
        colors: cssColors,
      });

      mockExtractColorsHueBinning.mockResolvedValue(visualColors);
      mockFilterGrayscale.mockReturnValue(visualColors);
      mockMergeColorsHueBinningFirst.mockReturnValue(palette);
      mockGenerateTheme.mockReturnValue(theme);

      const result = await extractWebsiteTheme('https://example.com');

      expect(mockMergeColorsHueBinningFirst).toHaveBeenCalled();
      expect(mockCaptureScreenshot).toHaveBeenCalled();
      expect(result.source).toBe('vision-first');
    });
  });

  describe('Fallback-DOM path', () => {
    it('should use fallback-dom when visual colors < 2 after filtering', async () => {
      const cssColors = {
        '--primary': '#3B82F6',
      };

      const domColors = {
        logo: ['#3B82F6'],
        cta: ['#10B981'],
        navigation: ['#F59E0B'],
        headings: [],
        accent: [],
      };

      const visualColors = [
        { hex: '#CCCCCC', area: 1000 }, // grayscale, will be filtered
      ];

      const palette = ['#3B82F6', '#10B981', '#F59E0B'];
      const theme: ThemeColors = {
        surveyPrimary: '221.2 83.2% 53.3%',
        surveyPrimaryFg: '0 0% 100%',
        surveyBg: '0 0% 100%',
        surveyFg: '222.2 84% 4.9%',
        surveyMuted: '210 40% 96.1%',
        surveyMutedFg: '215.4 16.3% 46.9%',
        surveyBorder: '214.3 31.8% 91.4%',
        surveyInput: '214.3 31.8% 91.4%',
        surveyCard: '0 0% 100%',
        surveyCardFg: '222.2 84% 4.9%',
      };

      mockExtractCSSVariables.mockResolvedValue({
        found: true,
        colors: cssColors,
      });

      mockExtractDOMColors.mockResolvedValue(domColors);
      mockExtractColorsHueBinning.mockResolvedValue(visualColors);
      mockFilterGrayscale.mockReturnValue([]); // All filtered out
      mockMergeColors.mockReturnValue(palette);
      mockGenerateTheme.mockReturnValue(theme);

      const result = await extractWebsiteTheme('https://example.com');

      expect(mockExtractCSSVariables).toHaveBeenCalledWith(mockPage);
      expect(mockExtractDOMColors).toHaveBeenCalledWith(mockPage);
      expect(mockCaptureScreenshot).toHaveBeenCalledWith(mockPage);
      expect(mockExtractColorsHueBinning).toHaveBeenCalled();
      expect(mockFilterGrayscale).toHaveBeenCalledWith(visualColors);
      expect(mockMergeColors).toHaveBeenCalled();
      expect(mockGenerateTheme).toHaveBeenCalledWith(palette);
      expect(mockBrowser.close).toHaveBeenCalled();

      expect(result).toEqual({
        palette,
        suggestedTheme: theme,
        source: 'fallback-dom',
      } as WebsiteThemeResult);
    });

    it('should use fallback-dom when extractColorsWithArea throws error', async () => {
      const cssColors = {
        '--primary': '#3B82F6',
        '--secondary': '#10B981',
      };

      const domColors = {
        logo: ['#3B82F6'],
        cta: ['#10B981'],
        navigation: ['#F59E0B'],
        headings: [],
        accent: [],
      };

      const palette = ['#3B82F6', '#10B981', '#F59E0B'];
      const theme: ThemeColors = {
        surveyPrimary: '221.2 83.2% 53.3%',
        surveyPrimaryFg: '0 0% 100%',
        surveyBg: '0 0% 100%',
        surveyFg: '222.2 84% 4.9%',
        surveyMuted: '210 40% 96.1%',
        surveyMutedFg: '215.4 16.3% 46.9%',
        surveyBorder: '214.3 31.8% 91.4%',
        surveyInput: '214.3 31.8% 91.4%',
        surveyCard: '0 0% 100%',
        surveyCardFg: '222.2 84% 4.9%',
      };

      mockExtractCSSVariables.mockResolvedValue({
        found: true,
        colors: cssColors,
      });

      mockExtractDOMColors.mockResolvedValue(domColors);
      mockExtractColorsHueBinning.mockRejectedValue(new Error('Vision extraction failed'));
      mockMergeColors.mockReturnValue(palette);
      mockGenerateTheme.mockReturnValue(theme);

      const result = await extractWebsiteTheme('https://example.com');

      expect(mockExtractCSSVariables).toHaveBeenCalledWith(mockPage);
      expect(mockExtractDOMColors).toHaveBeenCalledWith(mockPage);
      expect(mockCaptureScreenshot).toHaveBeenCalledWith(mockPage);
      expect(mockExtractColorsHueBinning).toHaveBeenCalled();
      expect(mockMergeColors).toHaveBeenCalled();
      expect(mockGenerateTheme).toHaveBeenCalledWith(palette);
      expect(mockBrowser.close).toHaveBeenCalled();

      expect(result).toEqual({
        palette,
        suggestedTheme: theme,
        source: 'fallback-dom',
      } as WebsiteThemeResult);
    });

    it('should use fallback-dom when only 1 visual color after filtering', async () => {
      const domColors = {
        logo: ['#3B82F6'],
        cta: ['#10B981'],
        navigation: ['#F59E0B'],
        headings: [],
        accent: [],
      };

      const visualColors = [
        { hex: '#3B82F6', area: 1000 },
      ];

      const palette = ['#3B82F6', '#10B981', '#F59E0B'];
      const theme: ThemeColors = {
        surveyPrimary: '221.2 83.2% 53.3%',
        surveyPrimaryFg: '0 0% 100%',
        surveyBg: '0 0% 100%',
        surveyFg: '222.2 84% 4.9%',
        surveyMuted: '210 40% 96.1%',
        surveyMutedFg: '215.4 16.3% 46.9%',
        surveyBorder: '214.3 31.8% 91.4%',
        surveyInput: '214.3 31.8% 91.4%',
        surveyCard: '0 0% 100%',
        surveyCardFg: '222.2 84% 4.9%',
      };

      mockExtractCSSVariables.mockResolvedValue({
        found: false,
        colors: {},
      });

      mockExtractDOMColors.mockResolvedValue(domColors);
      mockExtractColorsHueBinning.mockResolvedValue(visualColors);
      mockFilterGrayscale.mockReturnValue(visualColors); // Only 1 color
      mockMergeColors.mockReturnValue(palette);
      mockGenerateTheme.mockReturnValue(theme);

      const result = await extractWebsiteTheme('https://example.com');

      expect(mockCaptureScreenshot).toHaveBeenCalledWith(mockPage);
      expect(mockExtractColorsHueBinning).toHaveBeenCalled();
      expect(mockFilterGrayscale).toHaveBeenCalled();
      expect(mockMergeColors).toHaveBeenCalled();
      expect(result.source).toBe('fallback-dom');
    });
  });

  describe('Browser lifecycle', () => {
    it('should close browser on successful completion', async () => {
      const cssColors = {
        '--primary': '#3B82F6',
        '--secondary': '#10B981',
        '--accent': '#F59E0B',
      };

      const visualColors = [
        { hex: '#3B82F6', area: 1000 },
        { hex: '#10B981', area: 800 },
      ];

      const palette = ['#3B82F6', '#10B981', '#F59E0B'];
      const theme: ThemeColors = {
        surveyPrimary: '221.2 83.2% 53.3%',
        surveyPrimaryFg: '0 0% 100%',
        surveyBg: '0 0% 100%',
        surveyFg: '222.2 84% 4.9%',
        surveyMuted: '210 40% 96.1%',
        surveyMutedFg: '215.4 16.3% 46.9%',
        surveyBorder: '214.3 31.8% 91.4%',
        surveyInput: '214.3 31.8% 91.4%',
        surveyCard: '0 0% 100%',
        surveyCardFg: '222.2 84% 4.9%',
      };

      mockExtractCSSVariables.mockResolvedValue({
        found: true,
        colors: cssColors,
      });

      mockExtractColorsHueBinning.mockResolvedValue(visualColors);
      mockFilterGrayscale.mockReturnValue(visualColors);
      mockMergeColorsHueBinningFirst.mockReturnValue(palette);
      mockGenerateTheme.mockReturnValue(theme);

      await extractWebsiteTheme('https://example.com');

      expect(mockBrowser.close).toHaveBeenCalledTimes(1);
    });

    it('should close browser on error during navigation', async () => {
      mockPage.goto = vi.fn().mockRejectedValue(new Error('Navigation timeout'));

      await expect(extractWebsiteTheme('https://example.com')).rejects.toThrow(
        'Navigation timeout'
      );

      expect(mockBrowser.close).toHaveBeenCalledTimes(1);
    });

    it('should close browser on error during CSS extraction', async () => {
      mockExtractCSSVariables.mockRejectedValue(new Error('CSS extraction failed'));

      await expect(extractWebsiteTheme('https://example.com')).rejects.toThrow(
        'CSS extraction failed'
      );

      expect(mockBrowser.close).toHaveBeenCalledTimes(1);
    });

    it('should close browser on error during screenshot capture', async () => {
      mockExtractCSSVariables.mockResolvedValue({
        found: false,
        colors: {},
      });

      mockExtractDOMColors.mockResolvedValue({
        logo: [],
        cta: [],
        navigation: [],
        headings: [],
        accent: [],
      });

      mockCaptureScreenshot.mockRejectedValue(new Error('Screenshot failed'));

      await expect(extractWebsiteTheme('https://example.com')).rejects.toThrow(
        'Screenshot failed'
      );

      expect(mockBrowser.close).toHaveBeenCalledTimes(1);
    });

    it('should close browser on error during color extraction', async () => {
      mockExtractCSSVariables.mockResolvedValue({
        found: false,
        colors: {},
      });

      mockExtractDOMColors.mockResolvedValue({
        logo: [],
        cta: [],
        navigation: [],
        headings: [],
        accent: [],
      });

      mockCaptureScreenshot.mockResolvedValue(Buffer.from('screenshot'));
      mockExtractColorsHueBinning.mockRejectedValue(new Error('Color extraction failed'));

      // When vision extraction fails, it should fall back to DOM colors
      // This should NOT throw an error anymore, it should use fallback-dom
      mockMergeColors.mockReturnValue([]);
      mockGenerateTheme.mockReturnValue({
        surveyPrimary: '221.2 83.2% 53.3%',
        surveyPrimaryFg: '0 0% 100%',
        surveyBg: '0 0% 100%',
        surveyFg: '222.2 84% 4.9%',
        surveyMuted: '210 40% 96.1%',
        surveyMutedFg: '215.4 16.3% 46.9%',
        surveyBorder: '214.3 31.8% 91.4%',
        surveyInput: '214.3 31.8% 91.4%',
        surveyCard: '0 0% 100%',
        surveyCardFg: '222.2 84% 4.9%',
      });

      const result = await extractWebsiteTheme('https://example.com');

      expect(result.source).toBe('fallback-dom');
      expect(mockBrowser.close).toHaveBeenCalledTimes(1);
    });

    it('should close browser on error during theme generation', async () => {
      const cssColors = {
        '--primary': '#3B82F6',
        '--secondary': '#10B981',
        '--accent': '#F59E0B',
      };

      const visualColors = [
        { hex: '#3B82F6', area: 1000 },
        { hex: '#10B981', area: 800 },
      ];

      const palette = ['#3B82F6', '#10B981', '#F59E0B'];

      mockExtractCSSVariables.mockResolvedValue({
        found: true,
        colors: cssColors,
      });

      mockExtractColorsHueBinning.mockResolvedValue(visualColors);
      mockFilterGrayscale.mockReturnValue(visualColors);
      mockMergeColorsHueBinningFirst.mockReturnValue(palette);
      mockGenerateTheme.mockImplementation(() => {
        throw new Error('Theme generation failed');
      });

      await expect(extractWebsiteTheme('https://example.com')).rejects.toThrow(
        'Theme generation failed'
      );

      expect(mockBrowser.close).toHaveBeenCalledTimes(1);
    });

    it('should handle browser being undefined on error before launch', async () => {
      mockLaunchSecureBrowser.mockRejectedValue(new Error('Browser launch failed'));

      await expect(extractWebsiteTheme('https://example.com')).rejects.toThrow(
        'Browser launch failed'
      );

      // close should not be called if browser was never created
      expect(mockBrowser.close).not.toHaveBeenCalled();
    });
  });

  describe('Error propagation', () => {
    it('should propagate URL validation errors', async () => {
      mockValidateAndResolveUrl.mockRejectedValue(new Error('Invalid URL'));

      await expect(extractWebsiteTheme('invalid-url')).rejects.toThrow('Invalid URL');

      expect(mockLaunchSecureBrowser).not.toHaveBeenCalled();
      expect(mockBrowser.close).not.toHaveBeenCalled();
    });

    it('should propagate browser launch errors', async () => {
      mockLaunchSecureBrowser.mockRejectedValue(new Error('Browser launch failed'));

      await expect(extractWebsiteTheme('https://example.com')).rejects.toThrow(
        'Browser launch failed'
      );

      expect(mockCreateSecurePage).not.toHaveBeenCalled();
    });

    it('should propagate page creation errors', async () => {
      mockCreateSecurePage.mockRejectedValue(new Error('Page creation failed'));

      await expect(extractWebsiteTheme('https://example.com')).rejects.toThrow(
        'Page creation failed'
      );

      expect(mockPage.goto).not.toHaveBeenCalled();
      expect(mockBrowser.close).toHaveBeenCalledTimes(1);
    });

    it('should propagate navigation errors', async () => {
      mockPage.goto = vi.fn().mockRejectedValue(new Error('Navigation failed'));

      await expect(extractWebsiteTheme('https://example.com')).rejects.toThrow(
        'Navigation failed'
      );

      expect(mockExtractCSSVariables).not.toHaveBeenCalled();
      expect(mockBrowser.close).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty palette from vision-first', async () => {
      const cssColors = {
        '--primary': '#3B82F6',
        '--secondary': '#10B981',
        '--accent': '#F59E0B',
      };

      const visualColors = [
        { hex: '#3B82F6', area: 1000 },
        { hex: '#10B981', area: 800 },
      ];

      const emptyPalette: string[] = [];
      const theme: ThemeColors = {
        surveyPrimary: '221.2 83.2% 53.3%',
        surveyPrimaryFg: '0 0% 100%',
        surveyBg: '0 0% 100%',
        surveyFg: '222.2 84% 4.9%',
        surveyMuted: '210 40% 96.1%',
        surveyMutedFg: '215.4 16.3% 46.9%',
        surveyBorder: '214.3 31.8% 91.4%',
        surveyInput: '214.3 31.8% 91.4%',
        surveyCard: '0 0% 100%',
        surveyCardFg: '222.2 84% 4.9%',
      };

      mockExtractCSSVariables.mockResolvedValue({
        found: true,
        colors: cssColors,
      });

      mockExtractColorsHueBinning.mockResolvedValue(visualColors);
      mockFilterGrayscale.mockReturnValue(visualColors);
      mockMergeColorsHueBinningFirst.mockReturnValue(emptyPalette);
      mockGenerateTheme.mockReturnValue(theme);

      const result = await extractWebsiteTheme('https://example.com');

      expect(mockGenerateTheme).toHaveBeenCalledWith(emptyPalette);
      expect(result.palette).toEqual(emptyPalette);
      expect(result.source).toBe('vision-first');
    });

    it('should handle empty palette from fallback-dom', async () => {
      const emptyPalette: string[] = [];
      const theme: ThemeColors = {
        surveyPrimary: '221.2 83.2% 53.3%',
        surveyPrimaryFg: '0 0% 100%',
        surveyBg: '0 0% 100%',
        surveyFg: '222.2 84% 4.9%',
        surveyMuted: '210 40% 96.1%',
        surveyMutedFg: '215.4 16.3% 46.9%',
        surveyBorder: '214.3 31.8% 91.4%',
        surveyInput: '214.3 31.8% 91.4%',
        surveyCard: '0 0% 100%',
        surveyCardFg: '222.2 84% 4.9%',
      };

      mockExtractCSSVariables.mockResolvedValue({
        found: false,
        colors: {},
      });

      mockExtractDOMColors.mockResolvedValue({
        logo: [],
        cta: [],
        navigation: [],
        headings: [],
        accent: [],
      });

      mockExtractColorsHueBinning.mockResolvedValue([]);
      mockFilterGrayscale.mockReturnValue([]);
      mockMergeColors.mockReturnValue(emptyPalette);
      mockGenerateTheme.mockReturnValue(theme);

      const result = await extractWebsiteTheme('https://example.com');

      expect(mockGenerateTheme).toHaveBeenCalledWith(emptyPalette);
      expect(result.palette).toEqual(emptyPalette);
      expect(result.source).toBe('fallback-dom');
    });

    it('should pass correct config to browser and page creation', async () => {
      const cssColors = {
        '--primary': '#3B82F6',
        '--secondary': '#10B981',
        '--accent': '#F59E0B',
      };

      const visualColors = [
        { hex: '#3B82F6', area: 1000 },
        { hex: '#10B981', area: 800 },
      ];

      const palette = ['#3B82F6', '#10B981', '#F59E0B'];
      const theme: ThemeColors = {
        surveyPrimary: '221.2 83.2% 53.3%',
        surveyPrimaryFg: '0 0% 100%',
        surveyBg: '0 0% 100%',
        surveyFg: '222.2 84% 4.9%',
        surveyMuted: '210 40% 96.1%',
        surveyMutedFg: '215.4 16.3% 46.9%',
        surveyBorder: '214.3 31.8% 91.4%',
        surveyInput: '214.3 31.8% 91.4%',
        surveyCard: '0 0% 100%',
        surveyCardFg: '222.2 84% 4.9%',
      };

      mockValidateAndResolveUrl.mockResolvedValue({
        url: 'https://custom-domain.com/path',
        resolvedIp: '1.2.3.4',
        hostname: 'custom-domain.com',
      });

      mockExtractCSSVariables.mockResolvedValue({
        found: true,
        colors: cssColors,
      });

      mockExtractColorsHueBinning.mockResolvedValue(visualColors);
      mockFilterGrayscale.mockReturnValue(visualColors);
      mockMergeColorsHueBinningFirst.mockReturnValue(palette);
      mockGenerateTheme.mockReturnValue(theme);

      await extractWebsiteTheme('https://custom-domain.com/path');

      expect(mockLaunchSecureBrowser).toHaveBeenCalledWith({
        timeout: 15000,
        viewport: { width: 1280, height: 720 },
        resolvedIp: '1.2.3.4',
        hostname: 'custom-domain.com',
      });

      expect(mockCreateSecurePage).toHaveBeenCalledWith(mockBrowser, {
        timeout: 15000,
        viewport: { width: 1280, height: 720 },
        resolvedIp: '1.2.3.4',
        hostname: 'custom-domain.com',
      });

      expect(mockPage.goto).toHaveBeenCalledWith('https://custom-domain.com/path', {
        timeout: 15000,
        waitUntil: 'networkidle',
      });
    });
  });
});
