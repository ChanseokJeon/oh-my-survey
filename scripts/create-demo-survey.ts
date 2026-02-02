import sharp from 'sharp';
import { extractColors } from '../src/lib/theme/extractor';
import { generateTheme } from '../src/lib/theme/generator';

async function createDemoData() {
  // 1. Create a beautiful gradient image (Purple to Pink)
  const width = 100, height = 100, channels = 3;
  const pixels = Buffer.alloc(width * height * channels);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels;
      const ratio = x / width;
      // Purple (#8B5CF6) to Pink (#EC4899)
      pixels[idx] = Math.round(139 + (236 - 139) * ratio);     // R
      pixels[idx+1] = Math.round(92 + (72 - 92) * ratio);      // G
      pixels[idx+2] = Math.round(246 + (153 - 246) * ratio);   // B
    }
  }
  
  const gradientImg = await sharp(pixels, { raw: { width, height, channels } }).png().toBuffer();
  
  // 2. Extract colors
  const palette = await extractColors(gradientImg);
  console.log('Extracted Palette:', palette);
  
  // 3. Generate theme
  const theme = generateTheme(palette);
  
  // 4. Create CustomThemeData
  const customTheme = {
    version: 1,
    colors: theme,
    meta: {
      source: 'image' as const,
      extractedPalette: palette,
      createdAt: new Date().toISOString()
    }
  };
  
  console.log('\n=== Custom Theme Data ===');
  console.log(JSON.stringify(customTheme, null, 2));
  
  // Output the theme as CSS variables for preview
  console.log('\n=== CSS Variables (for preview) ===');
  console.log(`:root {
  --survey-primary: ${theme.surveyPrimary};
  --survey-primary-fg: ${theme.surveyPrimaryFg};
  --survey-bg: ${theme.surveyBg};
  --survey-fg: ${theme.surveyFg};
  --survey-muted: ${theme.surveyMuted};
  --survey-muted-fg: ${theme.surveyMutedFg};
  --survey-border: ${theme.surveyBorder};
  --survey-card: ${theme.surveyCard};
  --survey-card-fg: ${theme.surveyCardFg};
}`);

  return customTheme;
}

createDemoData();
