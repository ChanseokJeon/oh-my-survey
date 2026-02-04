/**
 * Create a survey with creagen.vcat.ai theme
 *
 * Usage: npx tsx scripts/create-vcat-survey.ts
 */

const BASE_URL = 'http://localhost:3000';

interface CustomThemeData {
  version: 1;
  colors: {
    surveyBg: string;
    surveyBgRaw?: string;
    surveyFg: string;
    surveyPrimary: string;
    surveyPrimaryFg: string;
    surveyMuted: string;
    surveyMutedFg: string;
    surveyBorder: string;
    surveyInput: string;
    surveyCard: string;
    surveyCardFg: string;
  };
  meta: {
    source: 'image' | 'url' | 'manual' | 'website';
    extractedPalette?: string[];
    createdAt: string;
  };
}

// creagen.vcat.ai theme colors (extracted earlier)
// Primary: #00DB63 (green) → HSL(147, 100%, 43%)
// Background: #0A0A0B (dark) → HSL(210, 5%, 3%)
// Surface: #1F2225 → HSL(210, 6%, 13%)
// Text: #FFFFFF → HSL(0, 0%, 100%)
// Muted Text: #CCD1D6 → HSL(210, 9%, 81%)
// Gradient: linear-gradient(90deg, rgb(0, 182, 148) 0%, rgb(111, 255, 0) 100%)

const VCAT_THEME: CustomThemeData = {
  version: 1,
  colors: {
    surveyBg: '210 5% 3%',           // #0A0A0B
    surveyBgRaw: 'linear-gradient(135deg, #0A0A0B 0%, #1a1a1f 100%)', // Subtle dark gradient
    surveyFg: '0 0% 100%',           // #FFFFFF
    surveyPrimary: '147 100% 43%',   // #00DB63
    surveyPrimaryFg: '0 0% 100%',    // White on green
    surveyMuted: '210 6% 13%',       // #1F2225
    surveyMutedFg: '210 9% 81%',     // #CCD1D6
    surveyBorder: '210 6% 20%',      // Slightly lighter border
    surveyInput: '210 6% 13%',       // #1F2225
    surveyCard: '210 6% 15%',        // Slightly lighter than bg
    surveyCardFg: '0 0% 100%',       // #FFFFFF
  },
  meta: {
    source: 'website',
    extractedPalette: ['#00DB63', '#0A0A0B', '#1F2225', '#FFFFFF', '#CCD1D6'],
    createdAt: new Date().toISOString(),
  },
};

async function loginAndGetCookies(): Promise<string> {
  // Get CSRF token
  const csrfResponse = await fetch(`${BASE_URL}/api/auth/csrf`);
  const csrfData = await csrfResponse.json();
  const csrfToken = csrfData.csrfToken;

  const csrfCookies = csrfResponse.headers.get('set-cookie');
  const cookieHeader = csrfCookies
    ? csrfCookies
        .split(/,(?=\s*\w+=)/)
        .map((c) => c.split(';')[0].trim())
        .join('; ')
    : '';

  // Login with test credentials
  const response = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      ...(cookieHeader && { Cookie: cookieHeader }),
    },
    body: new URLSearchParams({
      csrfToken,
      email: 'test@example.com',
      password: 'test1234',
    }),
    redirect: 'manual',
  });

  const cookies = response.headers.get('set-cookie');
  if (!cookies) {
    throw new Error('No cookies received from login');
  }

  const sessionMatch = cookies.match(/authjs\.session-token=([^;]+)/);
  if (!sessionMatch) {
    throw new Error('No session token in cookies');
  }

  return `authjs.session-token=${sessionMatch[1]}`;
}

async function main() {
  console.log('🚀 Creating survey with creagen.vcat.ai theme...\n');

  // 1. Login
  console.log('1️⃣ Logging in...');
  const cookies = await loginAndGetCookies();
  console.log('   ✅ Logged in successfully\n');

  // 2. Create survey
  console.log('2️⃣ Creating survey...');
  const createResponse = await fetch(`${BASE_URL}/api/surveys`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookies,
    },
    body: JSON.stringify({
      title: 'Creagen VCAT 스타일 설문조사',
      theme: 'dark', // Initial theme (will be changed to custom)
    }),
  });

  if (!createResponse.ok) {
    const error = await createResponse.text();
    throw new Error(`Failed to create survey: ${error}`);
  }

  const survey = await createResponse.json();
  console.log(`   ✅ Survey created: ${survey.id}\n`);

  // 3. Add sample questions
  console.log('3️⃣ Adding questions...');
  const questionsToAdd = [
    {
      type: 'short_text',
      title: '서비스를 알게 된 경로는 무엇인가요?',
      required: true,
    },
    {
      type: 'multiple_choice',
      title: '어떤 기능이 가장 마음에 드셨나요?',
      options: ['AI 자동 생성', '테마 커스터마이징', '실시간 응답 수집', '기타'],
      required: true,
    },
    {
      type: 'rating',
      title: '전반적인 만족도는 어떠셨나요?',
      required: true,
    },
    {
      type: 'long_text',
      title: '추가 의견이나 개선점이 있다면 알려주세요.',
      required: false,
    },
  ];

  let successCount = 0;
  for (const question of questionsToAdd) {
    const qResponse = await fetch(
      `${BASE_URL}/api/surveys/${survey.id}/questions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookies,
        },
        body: JSON.stringify(question),
      }
    );
    if (qResponse.ok) {
      successCount++;
    } else {
      const errorText = await qResponse.text();
      console.warn(`   ⚠️ Failed to add question "${question.title}": ${errorText}`);
    }
  }
  console.log(`   ✅ Added ${successCount}/${questionsToAdd.length} questions\n`);

  // 4. Apply custom theme
  console.log('4️⃣ Applying VCAT theme...');
  const themeResponse = await fetch(`${BASE_URL}/api/surveys/${survey.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookies,
    },
    body: JSON.stringify({
      theme: 'custom',
      customTheme: VCAT_THEME,
    }),
  });

  if (!themeResponse.ok) {
    const error = await themeResponse.text();
    console.warn(`   ⚠️ Theme update warning: ${error}`);
  } else {
    console.log('   ✅ Custom theme applied\n');
  }

  // 5. Publish survey
  console.log('5️⃣ Publishing survey...');
  const publishResponse = await fetch(
    `${BASE_URL}/api/surveys/${survey.id}/publish`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookies,
      },
      body: JSON.stringify({ action: 'publish' }),
    }
  );

  if (!publishResponse.ok) {
    const error = await publishResponse.text();
    console.warn(`   ⚠️ Publish warning: ${error}`);
  } else {
    console.log('   ✅ Survey published\n');
  }

  // 6. Get survey details for slug
  const detailResponse = await fetch(`${BASE_URL}/api/surveys/${survey.id}`, {
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookies,
    },
  });

  if (!detailResponse.ok) {
    console.log(`   ⚠️ Could not fetch survey details. Using slug from ID.`);
    console.log(`\n🔗 Survey ID: ${survey.id}`);
    console.log(`   Check the dashboard at: ${BASE_URL}`);
    return;
  }

  const detail = await detailResponse.json();

  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  console.log('🎉 Survey created successfully!');
  console.log('');
  console.log(`📋 Title: ${detail.survey.title}`);
  console.log(`🎨 Theme: custom (creagen.vcat.ai style)`);
  console.log(`📝 Questions: ${detail.questions.length}`);
  console.log('');
  console.log('🔗 Public Survey Link:');
  console.log(`   ${BASE_URL}/s/${detail.survey.slug}`);
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
}

main().catch((error) => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
