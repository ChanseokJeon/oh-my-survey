/**
 * Test Data Cleanup Utilities
 * Ensures test data is properly cleaned up after test runs
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

/**
 * Login and get session cookie
 */
async function getSessionCookie(): Promise<string> {
  const email = 'test@example.com';
  const password = 'test1234';

  // Get CSRF token with cookie jar
  const csrfResponse = await fetch(`${BASE_URL}/api/auth/csrf`);
  const csrfData = await csrfResponse.json();
  const csrfToken = csrfData.csrfToken;
  const csrfCookie = csrfResponse.headers.get('set-cookie')?.split(';')[0] || '';

  // Login with CSRF cookie
  const loginResponse = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': csrfCookie,
    },
    body: new URLSearchParams({ csrfToken, email, password }),
    redirect: 'manual',
  });

  const setCookie = loginResponse.headers.get('set-cookie');
  if (!setCookie) {
    console.error('Login response status:', loginResponse.status);
    throw new Error('Login failed - no cookie');
  }

  // Combine cookies
  const sessionCookie = setCookie.split(';')[0];
  return `${csrfCookie}; ${sessionCookie}`;
}

/**
 * Delete all test surveys matching a pattern
 */
export async function cleanupTestSurveys(pattern?: string): Promise<{ deleted: number; errors: number }> {
  const cookie = await getSessionCookie();

  // Verify session
  const sessionCheck = await fetch(`${BASE_URL}/api/auth/session`, {
    headers: { Cookie: cookie },
  });
  const session = await sessionCheck.json();
  if (!session?.user) {
    console.error('Session not valid:', session);
    return { deleted: 0, errors: 1 };
  }
  console.log(`Logged in as: ${session.user.email}`);

  // Get all surveys
  const response = await fetch(`${BASE_URL}/api/surveys`, {
    headers: { Cookie: cookie },
  });

  if (!response.ok) {
    console.error('Failed to fetch surveys for cleanup, status:', response.status);
    return { deleted: 0, errors: 1 };
  }

  const { surveys } = await response.json();

  // Filter test surveys (matching pattern or containing "Test")
  const testSurveys = surveys.filter((s: { title: string }) => {
    if (pattern) {
      return s.title.includes(pattern);
    }
    // Default: match common test patterns
    return (
      s.title.includes('Test') ||
      s.title.includes('test') ||
      s.title.includes('E2E') ||
      s.title.includes('Integration') ||
      s.title.includes('UI Test') ||
      s.title.includes('Nav Test') ||
      s.title.includes('Tab Test') ||
      s.title.includes('Question Test') ||
      s.title.includes('Settings Test') ||
      s.title.includes('Responses Test') ||
      s.title.includes('Selection Test') ||
      s.title.includes('Bulk Delete')
    );
  });

  let deleted = 0;
  let errors = 0;

  for (const survey of testSurveys) {
    try {
      const deleteResponse = await fetch(`${BASE_URL}/api/surveys/${survey.id}`, {
        method: 'DELETE',
        headers: { Cookie: cookie },
      });

      if (deleteResponse.ok) {
        deleted++;
        console.log(`  Deleted: ${survey.title}`);
      } else {
        errors++;
        console.warn(`  Failed to delete: ${survey.title}`);
      }
    } catch (error) {
      errors++;
      console.error(`  Error deleting ${survey.title}:`, error);
    }
  }

  return { deleted, errors };
}

/**
 * Run cleanup as a standalone script
 */
async function main() {
  console.log('=== Test Data Cleanup ===\n');
  console.log('Cleaning up test surveys...\n');

  try {
    const result = await cleanupTestSurveys();
    console.log(`\n=== Cleanup Complete ===`);
    console.log(`Deleted: ${result.deleted}`);
    console.log(`Errors: ${result.errors}`);
  } catch (error) {
    console.error('Cleanup failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}
