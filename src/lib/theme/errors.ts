// src/lib/theme/errors.ts

export const THEME_ERRORS = {
  INVALID_URL: 'Invalid or inaccessible URL',
  SSRF_BLOCKED: 'This URL is not allowed',
  INVALID_IMAGE: 'Invalid image format. Supported: JPEG, PNG, GIF, WebP',
  SIZE_EXCEEDED: 'Image exceeds 5MB limit',
  DIMENSION_EXCEEDED: 'Image dimensions exceed 4096px limit',
  EXTRACTION_FAILED: 'Failed to extract colors from image',
  EXTRACTION_TIMEOUT: 'Image processing timed out',
  RATE_LIMITED: 'Too many requests. Please try again later.',
  UNAUTHORIZED: 'You must be logged in',
  FORBIDDEN: 'You do not have access to this survey',
} as const;

export const ERROR_RECOVERY: Record<
  string,
  { retryable: boolean; suggestion: string }
> = {
  SIZE_EXCEEDED: {
    retryable: false,
    suggestion: 'Please use an image smaller than 5MB',
  },
  SSRF_BLOCKED: {
    retryable: false,
    suggestion: 'Please use a publicly accessible URL',
  },
  EXTRACTION_FAILED: {
    retryable: true,
    suggestion: 'Try a different image',
  },
  EXTRACTION_TIMEOUT: {
    retryable: true,
    suggestion: 'Try again or use a smaller image',
  },
  RATE_LIMITED: {
    retryable: true,
    suggestion: 'Wait a moment and try again',
  },
  INVALID_IMAGE: {
    retryable: false,
    suggestion: 'Please use a valid JPEG, PNG, GIF, or WebP image',
  },
  DIMENSION_EXCEEDED: {
    retryable: false,
    suggestion: 'Please use an image smaller than 4096x4096 pixels',
  },
};
