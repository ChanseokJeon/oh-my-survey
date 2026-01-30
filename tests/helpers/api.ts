/**
 * API Test Helpers
 * Utilities for authenticated API testing
 */

const BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

/**
 * Login and get session cookies
 */
export async function loginAndGetCookies(
  email: string,
  password: string
): Promise<string> {
  // First get CSRF token
  const csrfResponse = await fetch(`${BASE_URL}/api/auth/csrf`);
  const csrfData = await csrfResponse.json();
  const csrfToken = csrfData.csrfToken;

  // Use NextAuth credentials provider
  const response = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      csrfToken,
      email,
      password,
    }),
    redirect: 'manual',
  });

  const cookies = response.headers.get('set-cookie');
  if (!cookies) {
    throw new Error('No cookies received from login');
  }

  // Return just the session cookie
  return cookies.split(';')[0];
}

/**
 * Get authentication cookies (for tests using existing session)
 */
export async function getAuthCookies(): Promise<string> {
  // Default test credentials
  const email = process.env.TEST_EMAIL || 'test@example.com';
  const password = process.env.TEST_PASSWORD || 'test1234';

  return loginAndGetCookies(email, password);
}

/**
 * Make an authenticated API request
 */
export async function authFetch(
  path: string,
  options?: RequestInit
): Promise<Response> {
  const cookies = await getAuthCookies();

  const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;

  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
      Cookie: cookies,
    },
  });
}

/**
 * Make an authenticated GET request and parse JSON
 */
export async function authGet<T = any>(path: string): Promise<T> {
  const response = await authFetch(path, { method: 'GET' });

  if (!response.ok) {
    throw new Error(`GET ${path} failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Make an authenticated POST request and parse JSON
 */
export async function authPost<T = any>(
  path: string,
  data?: any
): Promise<T> {
  const response = await authFetch(path, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!response.ok) {
    throw new Error(`POST ${path} failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Make an authenticated PUT request and parse JSON
 */
export async function authPut<T = any>(
  path: string,
  data?: any
): Promise<T> {
  const response = await authFetch(path, {
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!response.ok) {
    throw new Error(`PUT ${path} failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Make an authenticated PATCH request and parse JSON
 */
export async function authPatch<T = any>(
  path: string,
  data?: any
): Promise<T> {
  const response = await authFetch(path, {
    method: 'PATCH',
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!response.ok) {
    throw new Error(`PATCH ${path} failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Make an authenticated DELETE request
 */
export async function authDelete(path: string): Promise<Response> {
  const response = await authFetch(path, { method: 'DELETE' });

  if (!response.ok) {
    throw new Error(`DELETE ${path} failed: ${response.status} ${response.statusText}`);
  }

  return response;
}

/**
 * Wait for server to be ready
 */
export async function waitForServer(
  maxAttempts: number = 30,
  delayMs: number = 1000
): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(`${BASE_URL}/api/auth/session`);
      if (response.ok) {
        return;
      }
    } catch (error) {
      // Server not ready yet
    }
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
  throw new Error('Server did not become ready in time');
}
