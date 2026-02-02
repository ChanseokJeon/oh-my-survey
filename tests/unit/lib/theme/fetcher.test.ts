// tests/unit/lib/theme/fetcher.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fetchImageFromUrl } from '@/lib/theme/fetcher';

describe('fetchImageFromUrl', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    vi.clearAllTimers();
  });

  it('should successfully fetch an image', async () => {
    const mockImageData = Buffer.from('fake-image-data');
    const mockResponse = new Response(mockImageData, {
      status: 200,
      headers: {
        'content-type': 'image/png',
        'content-length': mockImageData.length.toString(),
      },
    });

    fetchSpy.mockResolvedValueOnce(mockResponse);

    const result = await fetchImageFromUrl('https://example.com/image.png');

    expect(result).toBeInstanceOf(Buffer);
    expect(result.toString()).toBe('fake-image-data');
    expect(fetchSpy).toHaveBeenCalledWith('https://example.com/image.png', {
      signal: expect.any(AbortSignal),
      redirect: 'error',
      headers: {
        'User-Agent': 'oh-my-survey-theme-extractor/1.0',
      },
    });
  });

  it('should validate content-type is an image', async () => {
    const mockResponse = new Response('not an image', {
      status: 200,
      headers: {
        'content-type': 'text/html',
      },
    });

    fetchSpy.mockResolvedValueOnce(mockResponse);

    await expect(
      fetchImageFromUrl('https://example.com/not-image.html')
    ).rejects.toThrow('Response is not an image');
  });

  it('should accept various image content types', async () => {
    const testCases = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

    for (const contentType of testCases) {
      const mockImageData = Buffer.from('image-data');
      const mockResponse = new Response(mockImageData, {
        status: 200,
        headers: {
          'content-type': contentType,
        },
      });

      fetchSpy.mockResolvedValueOnce(mockResponse);

      const result = await fetchImageFromUrl('https://example.com/image');
      expect(result).toBeInstanceOf(Buffer);
    }
  });

  it('should reject images exceeding 5MB based on content-length header', async () => {
    const mockResponse = new Response('', {
      status: 200,
      headers: {
        'content-type': 'image/png',
        'content-length': (6 * 1024 * 1024).toString(), // 6MB
      },
    });

    fetchSpy.mockResolvedValueOnce(mockResponse);

    await expect(
      fetchImageFromUrl('https://example.com/large-image.png')
    ).rejects.toThrow('Image too large');
  });

  it('should reject images exceeding 5MB based on actual buffer size', async () => {
    // Create a buffer larger than 5MB
    const largeBuffer = Buffer.alloc(6 * 1024 * 1024);
    const mockResponse = new Response(largeBuffer, {
      status: 200,
      headers: {
        'content-type': 'image/png',
        // No content-length header to test actual size validation
      },
    });

    fetchSpy.mockResolvedValueOnce(mockResponse);

    await expect(
      fetchImageFromUrl('https://example.com/large-image.png')
    ).rejects.toThrow('Image too large');
  });

  it('should handle HTTP error responses', async () => {
    const mockResponse = new Response('Not Found', {
      status: 404,
      statusText: 'Not Found',
    });

    fetchSpy.mockResolvedValueOnce(mockResponse);

    await expect(
      fetchImageFromUrl('https://example.com/missing.png')
    ).rejects.toThrow('HTTP 404: Not Found');
  });

  it('should handle HTTP 500 errors', async () => {
    const mockResponse = new Response('Internal Server Error', {
      status: 500,
      statusText: 'Internal Server Error',
    });

    fetchSpy.mockResolvedValueOnce(mockResponse);

    await expect(
      fetchImageFromUrl('https://example.com/error.png')
    ).rejects.toThrow('HTTP 500: Internal Server Error');
  });

  it('should handle network errors', async () => {
    fetchSpy.mockRejectedValueOnce(new Error('Network error'));

    await expect(
      fetchImageFromUrl('https://example.com/image.png')
    ).rejects.toThrow('Network error');
  });

  it('should abort fetch when signal is aborted', async () => {
    let capturedSignal: AbortSignal | undefined;

    fetchSpy.mockImplementationOnce((_url: string | URL | Request, options?: RequestInit) => {
      if (options && typeof options === 'object' && 'signal' in options) {
        capturedSignal = options.signal as AbortSignal;
      }
      return Promise.reject(new DOMException('The operation was aborted', 'AbortError'));
    });

    await expect(
      fetchImageFromUrl('https://example.com/image.png')
    ).rejects.toThrow('The operation was aborted');

    expect(capturedSignal).toBeDefined();
  });

  it('should block redirects with redirect: error', async () => {
    // When fetch encounters a redirect with redirect: 'error', it throws
    fetchSpy.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await expect(
      fetchImageFromUrl('https://example.com/redirect.png')
    ).rejects.toThrow('Failed to fetch');
  });

  it('should handle missing content-type header', async () => {
    const mockResponse = new Response(Buffer.from('data'), {
      status: 200,
      headers: {}, // No content-type
    });

    fetchSpy.mockResolvedValueOnce(mockResponse);

    await expect(
      fetchImageFromUrl('https://example.com/no-content-type.png')
    ).rejects.toThrow('Response is not an image');
  });

  it('should handle image at exactly 5MB', async () => {
    const exactSizeBuffer = Buffer.alloc(5 * 1024 * 1024); // Exactly 5MB
    const mockResponse = new Response(exactSizeBuffer, {
      status: 200,
      headers: {
        'content-type': 'image/png',
        'content-length': exactSizeBuffer.length.toString(),
      },
    });

    fetchSpy.mockResolvedValueOnce(mockResponse);

    const result = await fetchImageFromUrl('https://example.com/exact-size.png');
    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBe(5 * 1024 * 1024);
  });

  it('should send correct User-Agent header', async () => {
    const mockResponse = new Response(Buffer.from('data'), {
      status: 200,
      headers: {
        'content-type': 'image/png',
      },
    });

    fetchSpy.mockResolvedValueOnce(mockResponse);

    await fetchImageFromUrl('https://example.com/image.png');

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: {
          'User-Agent': 'oh-my-survey-theme-extractor/1.0',
        },
      })
    );
  });

  it('should clear timeout on successful completion', async () => {
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

    const mockResponse = new Response(Buffer.from('data'), {
      status: 200,
      headers: {
        'content-type': 'image/png',
      },
    });

    fetchSpy.mockResolvedValueOnce(mockResponse);

    await fetchImageFromUrl('https://example.com/image.png');

    expect(clearTimeoutSpy).toHaveBeenCalled();

    clearTimeoutSpy.mockRestore();
  });

  it('should clear timeout on error', async () => {
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

    fetchSpy.mockRejectedValueOnce(new Error('Network error'));

    await expect(
      fetchImageFromUrl('https://example.com/image.png')
    ).rejects.toThrow();

    expect(clearTimeoutSpy).toHaveBeenCalled();

    clearTimeoutSpy.mockRestore();
  });

  it('should handle empty response body', async () => {
    const mockResponse = new Response(Buffer.from(''), {
      status: 200,
      headers: {
        'content-type': 'image/png',
        'content-length': '0',
      },
    });

    fetchSpy.mockResolvedValueOnce(mockResponse);

    const result = await fetchImageFromUrl('https://example.com/empty.png');
    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBe(0);
  });

  it('should handle invalid content-length header gracefully', async () => {
    const mockImageData = Buffer.from('image-data');
    const mockResponse = new Response(mockImageData, {
      status: 200,
      headers: {
        'content-type': 'image/png',
        'content-length': 'invalid', // Invalid number
      },
    });

    fetchSpy.mockResolvedValueOnce(mockResponse);

    // Should still succeed because actual buffer size is checked
    const result = await fetchImageFromUrl('https://example.com/image.png');
    expect(result).toBeInstanceOf(Buffer);
  });
});
