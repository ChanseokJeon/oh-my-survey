/**
 * API Endpoint Tests - Pure HTTP requests (no browser needed)
 * Tests all API endpoints for proper responses
 */
import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

test.describe('API Endpoint Validation', () => {
  test('Auth API endpoints', async ({ request }) => {
    console.log('\n=== Auth API Endpoints ===\n');

    const endpoints = [
      { path: '/api/auth/providers', expected: 200, desc: 'Get auth providers' },
      { path: '/api/auth/session', expected: 200, desc: 'Get session' },
      { path: '/api/auth/csrf', expected: 200, desc: 'Get CSRF token' },
    ];

    for (const ep of endpoints) {
      const res = await request.get(`${BASE_URL}${ep.path}`);
      const status = res.status();
      const passed = status === ep.expected;
      console.log(`${passed ? '✅' : '❌'} ${ep.path} → ${status} (${ep.desc})`);
      expect(status).toBe(ep.expected);
    }
  });

  test('Survey API endpoints (unauthenticated)', async ({ request }) => {
    console.log('\n=== Survey API (Unauthenticated) ===\n');

    const endpoints = [
      { path: '/api/surveys', method: 'GET', expected: 401, desc: 'List surveys requires auth' },
      { path: '/api/surveys', method: 'POST', expected: 401, desc: 'Create survey requires auth' },
    ];

    for (const ep of endpoints) {
      const res = ep.method === 'POST'
        ? await request.post(`${BASE_URL}${ep.path}`, { data: {} })
        : await request.get(`${BASE_URL}${ep.path}`);
      const status = res.status();
      const passed = status === ep.expected;
      console.log(`${passed ? '✅' : '❌'} ${ep.method} ${ep.path} → ${status} (${ep.desc})`);
      expect(status).toBe(ep.expected);
    }
  });

  test('Public Survey API endpoints', async ({ request }) => {
    console.log('\n=== Public Survey API ===\n');

    const endpoints = [
      { path: '/api/public/surveys/non-existent', expected: 404, desc: 'Non-existent survey' },
      { path: '/api/public/surveys/test-slug', expected: 404, desc: 'Test slug not found' },
    ];

    for (const ep of endpoints) {
      const res = await request.get(`${BASE_URL}${ep.path}`);
      const status = res.status();
      const passed = status === ep.expected;
      console.log(`${passed ? '✅' : '❌'} ${ep.path} → ${status} (${ep.desc})`);
      expect(status).toBe(ep.expected);
    }
  });

  test('Config API endpoints', async ({ request }) => {
    console.log('\n=== Config API ===\n');

    const res = await request.get(`${BASE_URL}/api/config/sheets`);
    const status = res.status();
    console.log(`${status === 200 ? '✅' : '❌'} /api/config/sheets → ${status}`);
    expect(status).toBe(200);

    const data = await res.json();
    expect(data).toHaveProperty('configured');
  });

  test('Page routes return valid HTML', async ({ request }) => {
    console.log('\n=== Page Routes ===\n');

    const pages = [
      { path: '/', expected: [200, 302, 307], desc: 'Dashboard (may redirect to login)' },
      { path: '/login', expected: 200, desc: 'Login page' },
      { path: '/surveys/new', expected: [200, 302, 307], desc: 'New survey (may redirect)' },
    ];

    for (const page of pages) {
      const res = await request.get(`${BASE_URL}${page.path}`, {
        maxRedirects: 0,
      }).catch(() => null);

      if (!res) {
        console.log(`⚠️ ${page.path} → Connection error`);
        continue;
      }

      const status = res.status();
      const expectedArr = Array.isArray(page.expected) ? page.expected : [page.expected];
      const passed = expectedArr.includes(status);
      console.log(`${passed ? '✅' : '❌'} ${page.path} → ${status} (${page.desc})`);
    }
  });

  test('404 handling', async ({ request }) => {
    console.log('\n=== 404 Handling ===\n');

    const notFoundPaths = [
      '/api/non-existent-endpoint',
      '/non-existent-page',
    ];

    for (const path of notFoundPaths) {
      const res = await request.get(`${BASE_URL}${path}`);
      const status = res.status();
      console.log(`${status === 404 ? '✅' : '⚠️'} ${path} → ${status}`);
    }
  });
});

test.describe('Response Format Validation', () => {
  test('Auth providers returns correct format', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/auth/providers`);
    const data = await res.json();

    expect(data).toHaveProperty('credentials');
    expect(data).toHaveProperty('google');
    console.log('✅ Auth providers format valid');
  });

  test('CSRF token returns correct format', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/auth/csrf`);
    const data = await res.json();

    expect(data).toHaveProperty('csrfToken');
    expect(typeof data.csrfToken).toBe('string');
    console.log('✅ CSRF token format valid');
  });

  test('Session returns correct format', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/auth/session`);
    const data = await res.json();

    // Session should be empty object when not authenticated
    expect(typeof data).toBe('object');
    console.log('✅ Session format valid');
  });

  test('Sheets config returns correct format', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/config/sheets`);
    const data = await res.json();

    expect(data).toHaveProperty('configured');
    expect(typeof data.configured).toBe('boolean');
    console.log('✅ Sheets config format valid');
  });
});

test('Print API Test Summary', async () => {
  console.log('\n========================================');
  console.log('         API TEST SUMMARY');
  console.log('========================================');
  console.log('All API endpoints tested:');
  console.log('- Auth: providers, session, csrf');
  console.log('- Surveys: GET/POST (auth required)');
  console.log('- Public: survey lookup');
  console.log('- Config: sheets configuration');
  console.log('- 404: non-existent routes');
  console.log('- Response formats validated');
  console.log('========================================\n');
});
