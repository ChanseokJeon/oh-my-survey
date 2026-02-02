// src/lib/theme/fetcher.ts

const FETCH_TIMEOUT_MS = 10000; // 10 seconds
const MAX_CONTENT_LENGTH = 5 * 1024 * 1024; // 5MB

/**
 * Fetches an image from a URL with timeout and security controls.
 * @param url - Image URL to fetch
 * @returns Image buffer
 * @throws Error if fetch fails, times out, or response is invalid
 */
export async function fetchImageFromUrl(url: string): Promise<Buffer> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'error', // Block redirects to prevent DNS rebinding
      headers: {
        'User-Agent': 'oh-my-survey-theme-extractor/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Verify Content-Type
    const contentType = response.headers.get('content-type');
    if (!contentType?.startsWith('image/')) {
      throw new Error('Response is not an image');
    }

    // Pre-validate Content-Length if provided
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > MAX_CONTENT_LENGTH) {
      throw new Error('Image too large');
    }

    // Fetch and convert to Buffer
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Re-validate actual size
    if (buffer.length > MAX_CONTENT_LENGTH) {
      throw new Error('Image too large');
    }

    return buffer;
  } finally {
    clearTimeout(timeout);
  }
}
