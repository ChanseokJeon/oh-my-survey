// Standalone script to test website theme extraction
import { extractWebsiteTheme } from '../src/lib/theme/website';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const url = process.argv[2] || 'https://vcat.ai';
  console.log(`Testing website theme extraction for: ${url}`);
  console.log('---');

  try {
    const startTime = Date.now();
    const result = await extractWebsiteTheme(url);
    const duration = Date.now() - startTime;

    console.log(`\nExtraction completed in ${duration}ms`);
    console.log('Extraction Source:', result.source);
    console.log('\nPalette:');
    result.palette.forEach((color, i) => {
      console.log(`  ${i + 1}. ${color}`);
    });
    console.log('\nSuggested Theme:');
    console.log(JSON.stringify(result.suggestedTheme, null, 2));

    // Save result to file for analysis
    const outputPath = path.join(process.cwd(), '.omc', 'theme-extraction-result.json');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify({
      url,
      timestamp: new Date().toISOString(),
      duration,
      ...result
    }, null, 2));
    console.log(`\nResult saved to: ${outputPath}`);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
