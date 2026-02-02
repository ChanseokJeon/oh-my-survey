import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  validateImageUrl,
  validateImageFile,
  validateBase64Image,
} from '@/lib/theme/validators';
import sharp from 'sharp';
import { fileTypeFromBuffer } from 'file-type';

// Create hoisted mock functions for DNS
const mockResolve4 = vi.hoisted(() => vi.fn());
const mockResolve6 = vi.hoisted(() => vi.fn());

// Mock DNS module with hoisted functions
vi.mock('dns/promises', () => ({
  default: {
    resolve4: mockResolve4,
    resolve6: mockResolve6,
  },
  resolve4: mockResolve4,
  resolve6: mockResolve6,
}));

// Mock sharp
vi.mock('sharp', () => ({
  default: vi.fn(),
}));

// Mock file-type
vi.mock('file-type', () => ({
  fileTypeFromBuffer: vi.fn(),
}));

describe('validateImageUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should accept valid HTTPS URL with public IP', async () => {
    mockResolve4.mockResolvedValueOnce(['8.8.8.8'] as any);
    mockResolve6.mockRejectedValueOnce(new Error('No IPv6'));

    const result = await validateImageUrl('https://example.com/image.jpg');
    expect(result.valid).toBe(true);
  });

  it('should accept valid HTTP URL', async () => {
    mockResolve4.mockResolvedValueOnce(['1.1.1.1'] as any);
    mockResolve6.mockRejectedValueOnce(new Error('No IPv6'));

    const result = await validateImageUrl('http://example.com/image.jpg');
    expect(result.valid).toBe(true);
  });

  it('should reject FTP protocol', async () => {
    const result = await validateImageUrl('ftp://example.com/image.jpg');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Only HTTP/HTTPS allowed');
  });

  it('should reject file:// protocol', async () => {
    const result = await validateImageUrl('file:///etc/passwd');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Only HTTP/HTTPS allowed');
  });

  it('should reject localhost hostname', async () => {
    const result = await validateImageUrl('http://localhost/image.jpg');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('This URL is not allowed');
  });

  it('should reject 127.0.0.1 hostname', async () => {
    const result = await validateImageUrl('http://127.0.0.1/image.jpg');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('This URL is not allowed');
  });

  it('should reject AWS metadata endpoint', async () => {
    const result = await validateImageUrl('http://169.254.169.254/latest/meta-data/');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('This URL is not allowed');
  });

  it('should reject GCP metadata endpoint', async () => {
    const result = await validateImageUrl('http://metadata.google.internal/');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('This URL is not allowed');
  });

  it('should reject URL resolving to 127.0.0.1', async () => {
    mockResolve4.mockResolvedValue(['127.0.0.1']);
    mockResolve6.mockRejectedValue(new Error('No IPv6'));

    const result = await validateImageUrl('http://evil.com/image.jpg');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('This URL is not allowed');
  });

  it('should reject URL resolving to 10.x.x.x (private range)', async () => {
    mockResolve4.mockResolvedValue(['10.0.0.1']);
    mockResolve6.mockRejectedValue(new Error('No IPv6'));

    const result = await validateImageUrl('http://internal.example.com/image.jpg');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('This URL is not allowed');
  });

  it('should reject URL resolving to 192.168.x.x', async () => {
    mockResolve4.mockResolvedValue(['192.168.1.1']);
    mockResolve6.mockRejectedValue(new Error('No IPv6'));

    const result = await validateImageUrl('http://router.local/image.jpg');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('This URL is not allowed');
  });

  it('should reject URL resolving to 172.16-31.x.x', async () => {
    mockResolve4.mockResolvedValue(['172.16.0.1']);
    mockResolve6.mockRejectedValue(new Error('No IPv6'));

    const result = await validateImageUrl('http://internal.corp/image.jpg');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('This URL is not allowed');
  });

  it('should reject URL resolving to link-local 169.254.x.x', async () => {
    mockResolve4.mockResolvedValue(['169.254.1.1']);
    mockResolve6.mockRejectedValue(new Error('No IPv6'));

    const result = await validateImageUrl('http://link-local.example.com/image.jpg');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('This URL is not allowed');
  });

  it('should reject IPv6 loopback (::1)', async () => {
    mockResolve4.mockRejectedValue(new Error('No IPv4'));
    mockResolve6.mockResolvedValue(['::1']);

    const result = await validateImageUrl('http://ipv6-host.example.com/image.jpg');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('This URL is not allowed');
  });

  it('should reject IPv6 link-local (fe80::)', async () => {
    mockResolve4.mockRejectedValue(new Error('No IPv4'));
    mockResolve6.mockResolvedValue(['fe80::1']);

    const result = await validateImageUrl('http://ipv6-local.example.com/image.jpg');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('This URL is not allowed');
  });

  it('should reject IPv6 unique local (fc00::, fd00::)', async () => {
    mockResolve4.mockRejectedValue(new Error('No IPv4'));
    mockResolve6.mockResolvedValue(['fc00::1']);

    const result = await validateImageUrl('http://ipv6-unique.example.com/image.jpg');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('This URL is not allowed');
  });

  it('should reject if DNS resolution fails completely', async () => {
    mockResolve4.mockRejectedValue(new Error('DNS failed'));
    mockResolve6.mockRejectedValue(new Error('DNS failed'));

    const result = await validateImageUrl('http://nonexistent.example.com/image.jpg');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Could not resolve hostname');
  });

  it('should reject malformed URL', async () => {
    const result = await validateImageUrl('not-a-url');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Invalid URL');
  });

  it('should accept valid URL with both IPv4 and IPv6', async () => {
    mockResolve4.mockResolvedValue(['1.1.1.1']);
    mockResolve6.mockResolvedValue(['2606:4700:4700::1111']);

    const result = await validateImageUrl('https://cloudflare.com/image.jpg');
    expect(result.valid).toBe(true);
  });

  it('should reject if any resolved IP is blocked', async () => {
    mockResolve4.mockResolvedValue(['8.8.8.8', '127.0.0.1']);
    mockResolve6.mockRejectedValue(new Error('No IPv6'));

    const result = await validateImageUrl('http://mixed-ips.example.com/image.jpg');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('This URL is not allowed');
  });
});

describe('validateImageFile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should accept valid JPEG file', async () => {
    const buffer = Buffer.from('fake-jpeg-data');
    vi.mocked(fileTypeFromBuffer).mockResolvedValue({
      mime: 'image/jpeg',
      ext: 'jpg',
    });
    vi.mocked(sharp).mockReturnValue({
      metadata: vi.fn().mockResolvedValue({
        format: 'jpeg',
        width: 1024,
        height: 768,
      }),
    } as any);

    const result = await validateImageFile(buffer);
    expect(result.valid).toBe(true);
  });

  it('should accept valid PNG file', async () => {
    const buffer = Buffer.from('fake-png-data');
    vi.mocked(fileTypeFromBuffer).mockResolvedValue({
      mime: 'image/png',
      ext: 'png',
    });
    vi.mocked(sharp).mockReturnValue({
      metadata: vi.fn().mockResolvedValue({
        format: 'png',
        width: 800,
        height: 600,
      }),
    } as any);

    const result = await validateImageFile(buffer);
    expect(result.valid).toBe(true);
  });

  it('should reject file exceeding 5MB', async () => {
    const buffer = Buffer.alloc(6 * 1024 * 1024); // 6MB
    const result = await validateImageFile(buffer);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Image exceeds 5MB limit');
  });

  it('should reject file with invalid magic bytes', async () => {
    const buffer = Buffer.from('not-an-image');
    vi.mocked(fileTypeFromBuffer).mockResolvedValue(undefined);

    const result = await validateImageFile(buffer);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Invalid image format. Supported: JPEG, PNG, GIF, WebP');
  });

  it('should reject unsupported file type (e.g., SVG)', async () => {
    const buffer = Buffer.from('fake-svg-data');
    vi.mocked(fileTypeFromBuffer).mockResolvedValue({
      mime: 'image/svg+xml',
      ext: 'svg',
    });

    const result = await validateImageFile(buffer);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Invalid image format. Supported: JPEG, PNG, GIF, WebP');
  });

  it('should reject file that Sharp cannot parse (polyglot defense)', async () => {
    const buffer = Buffer.from('fake-image-data');
    vi.mocked(fileTypeFromBuffer).mockResolvedValue({
      mime: 'image/jpeg',
      ext: 'jpg',
    });
    vi.mocked(sharp).mockReturnValue({
      metadata: vi.fn().mockRejectedValue(new Error('Cannot parse')),
    } as any);

    const result = await validateImageFile(buffer);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Could not parse image');
  });

  it('should reject file with dimensions exceeding 4096px', async () => {
    const buffer = Buffer.from('fake-large-image');
    vi.mocked(fileTypeFromBuffer).mockResolvedValue({
      mime: 'image/png',
      ext: 'png',
    });
    vi.mocked(sharp).mockReturnValue({
      metadata: vi.fn().mockResolvedValue({
        format: 'png',
        width: 5000,
        height: 3000,
      }),
    } as any);

    const result = await validateImageFile(buffer);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Image dimensions exceed 4096px limit');
  });

  it('should reject if Sharp returns unexpected format', async () => {
    const buffer = Buffer.from('fake-image');
    vi.mocked(fileTypeFromBuffer).mockResolvedValue({
      mime: 'image/png',
      ext: 'png',
    });
    vi.mocked(sharp).mockReturnValue({
      metadata: vi.fn().mockResolvedValue({
        format: 'tiff', // Not in allowed list
        width: 1024,
        height: 768,
      }),
    } as any);

    const result = await validateImageFile(buffer);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Invalid image format');
  });

  it('should accept GIF file', async () => {
    const buffer = Buffer.from('fake-gif');
    vi.mocked(fileTypeFromBuffer).mockResolvedValue({
      mime: 'image/gif',
      ext: 'gif',
    });
    vi.mocked(sharp).mockReturnValue({
      metadata: vi.fn().mockResolvedValue({
        format: 'gif',
        width: 500,
        height: 500,
      }),
    } as any);

    const result = await validateImageFile(buffer);
    expect(result.valid).toBe(true);
  });

  it('should accept WebP file', async () => {
    const buffer = Buffer.from('fake-webp');
    vi.mocked(fileTypeFromBuffer).mockResolvedValue({
      mime: 'image/webp',
      ext: 'webp',
    });
    vi.mocked(sharp).mockReturnValue({
      metadata: vi.fn().mockResolvedValue({
        format: 'webp',
        width: 1200,
        height: 900,
      }),
    } as any);

    const result = await validateImageFile(buffer);
    expect(result.valid).toBe(true);
  });
});

describe('validateBase64Image', () => {
  it('should accept valid JPEG base64', () => {
    const base64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
    const result = validateBase64Image(base64);
    expect(result.valid).toBe(true);
  });

  it('should accept valid PNG base64', () => {
    const base64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==';
    const result = validateBase64Image(base64);
    expect(result.valid).toBe(true);
  });

  it('should accept valid GIF base64', () => {
    const base64 = 'data:image/gif;base64,R0lGODlhAQABAIAA==';
    const result = validateBase64Image(base64);
    expect(result.valid).toBe(true);
  });

  it('should accept valid WebP base64', () => {
    const base64 = 'data:image/webp;base64,UklGRiQAAABXRUJQVlA4==';
    const result = validateBase64Image(base64);
    expect(result.valid).toBe(true);
  });

  it('should reject base64 exceeding size limit', () => {
    const base64 = 'data:image/jpeg;base64,' + 'A'.repeat(8 * 1024 * 1024);
    const result = validateBase64Image(base64);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Image data too large');
  });

  it('should reject invalid data URI format', () => {
    const base64 = 'not-a-data-uri';
    const result = validateBase64Image(base64);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Invalid image format');
  });

  it('should reject unsupported image format (SVG)', () => {
    const base64 = 'data:image/svg+xml;base64,PHN2Zy8+';
    const result = validateBase64Image(base64);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Invalid image format');
  });

  it('should reject base64 without image type', () => {
    const base64 = 'data:application/octet-stream;base64,AQIDBA==';
    const result = validateBase64Image(base64);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Invalid image format');
  });

  it('should reject base64 without base64 encoding', () => {
    const base64 = 'data:image/jpeg,rawdata';
    const result = validateBase64Image(base64);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Invalid image format');
  });
});
