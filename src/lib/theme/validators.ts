// src/lib/theme/validators.ts

import dns from 'dns/promises';
import sharp from 'sharp';
import { fileTypeFromBuffer } from 'file-type';
import type { ValidationResult } from './types';

const BLOCKED_HOSTS = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '169.254.169.254', // AWS/Azure metadata
  'metadata.google.internal', // GCP metadata
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_DIMENSION = 4096;
const MAX_BASE64_LENGTH = 7 * 1024 * 1024; // ~5MB decoded
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

/**
 * Validates image URL for SSRF attacks.
 * Checks protocol, hostname, and resolves DNS to verify IP addresses.
 */
export async function validateImageUrl(url: string): Promise<ValidationResult> {
  try {
    const parsed = new URL(url);

    // 1. Protocol validation
    if (!['https:', 'http:'].includes(parsed.protocol)) {
      return { valid: false, error: 'Only HTTP/HTTPS allowed' };
    }

    // 2. Hostname blocklist check
    if (BLOCKED_HOSTS.includes(parsed.hostname.toLowerCase())) {
      return { valid: false, error: 'This URL is not allowed' };
    }

    // 3. DNS resolve and IP validation (DNS Rebinding defense)
    let addresses: string[] = [];
    let addresses6: string[] = [];

    try {
      addresses = await dns.resolve4(parsed.hostname);
    } catch {
      // IPv4 resolution failed, continue
    }

    try {
      addresses6 = await dns.resolve6(parsed.hostname);
    } catch {
      // IPv6 resolution failed, continue
    }

    // At least one address family should resolve
    if (addresses.length === 0 && addresses6.length === 0) {
      return { valid: false, error: 'Could not resolve hostname' };
    }

    // Check all resolved IPs
    for (const ip of [...addresses, ...addresses6]) {
      if (isBlockedIP(ip)) {
        return { valid: false, error: 'This URL is not allowed' };
      }
    }

    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL' };
  }
}

/**
 * Checks if IP address is in private/reserved ranges.
 * Supports both IPv4 and IPv6.
 */
function isBlockedIP(ip: string): boolean {
  // IPv4 private/reserved ranges
  if (
    ip.match(
      /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0\.0\.0\.0)/
    )
  ) {
    return true;
  }

  // IPv6 loopback, link-local, and unique local addresses
  if (
    ip === '::1' ||
    ip.startsWith('fe80:') ||
    ip.startsWith('fc00:') ||
    ip.startsWith('fd00:') ||
    ip === '::'
  ) {
    return true;
  }

  return false;
}

/**
 * Validates image file buffer.
 * Checks size, magic bytes, and parsability with Sharp.
 */
export async function validateImageFile(buffer: Buffer): Promise<ValidationResult> {
  // 1. Size validation
  if (buffer.length > MAX_FILE_SIZE) {
    return { valid: false, error: 'Image exceeds 5MB limit' };
  }

  // 2. Magic bytes validation
  const fileType = await fileTypeFromBuffer(buffer);
  if (!fileType || !ALLOWED_MIME_TYPES.includes(fileType.mime)) {
    return {
      valid: false,
      error: 'Invalid image format. Supported: JPEG, PNG, GIF, WebP',
    };
  }

  // 3. Sharp parsing validation (polyglot defense)
  try {
    const metadata = await sharp(buffer).metadata();
    if (!metadata.format || !['jpeg', 'png', 'gif', 'webp'].includes(metadata.format)) {
      return { valid: false, error: 'Invalid image format' };
    }
    if ((metadata.width || 0) > MAX_DIMENSION || (metadata.height || 0) > MAX_DIMENSION) {
      return { valid: false, error: 'Image dimensions exceed 4096px limit' };
    }
  } catch {
    return { valid: false, error: 'Could not parse image' };
  }

  return { valid: true };
}

/**
 * Validates base64-encoded image data.
 * Checks size and data URI format.
 */
export function validateBase64Image(base64: string): ValidationResult {
  if (base64.length > MAX_BASE64_LENGTH) {
    return { valid: false, error: 'Image data too large' };
  }

  const match = base64.match(/^data:image\/(jpeg|png|gif|webp);base64,/);
  if (!match) {
    return { valid: false, error: 'Invalid image format' };
  }

  return { valid: true };
}
