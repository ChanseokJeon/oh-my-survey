import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  validateAndResolveUrl,
  isBlockedIP,
} from '@/lib/theme/website/validator';

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

describe('validateAndResolveUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should accept valid HTTPS URL with public IP', async () => {
    mockResolve4.mockResolvedValueOnce(['8.8.8.8'] as any);
    mockResolve6.mockRejectedValueOnce(new Error('No IPv6'));

    const result = await validateAndResolveUrl('https://example.com/page.html');
    expect(result.url).toBe('https://example.com/page.html');
    expect(result.resolvedIp).toBe('8.8.8.8');
    expect(result.hostname).toBe('example.com');
  });

  it('should accept valid HTTP URL', async () => {
    mockResolve4.mockResolvedValueOnce(['1.1.1.1'] as any);
    mockResolve6.mockRejectedValueOnce(new Error('No IPv6'));

    const result = await validateAndResolveUrl('http://example.com/page.html');
    expect(result.url).toBe('http://example.com/page.html');
    expect(result.resolvedIp).toBe('1.1.1.1');
    expect(result.hostname).toBe('example.com');
  });

  it('should reject URL too long (>2048 chars)', async () => {
    const longUrl = 'https://example.com/' + 'a'.repeat(2050);

    await expect(validateAndResolveUrl(longUrl)).rejects.toThrow('URL too long');
  });

  it('should reject invalid URL', async () => {
    await expect(validateAndResolveUrl('not-a-valid-url')).rejects.toThrow(
      'Invalid URL'
    );
  });

  it('should reject FTP protocol', async () => {
    await expect(validateAndResolveUrl('ftp://example.com/file.txt')).rejects.toThrow(
      'Only HTTP/HTTPS allowed'
    );
  });

  it('should reject file:// protocol', async () => {
    await expect(validateAndResolveUrl('file:///etc/passwd')).rejects.toThrow(
      'Only HTTP/HTTPS allowed'
    );
  });

  it('should reject localhost hostname', async () => {
    await expect(validateAndResolveUrl('http://localhost/page.html')).rejects.toThrow(
      'URL not allowed'
    );
  });

  it('should reject 127.0.0.1 hostname', async () => {
    await expect(validateAndResolveUrl('http://127.0.0.1/page.html')).rejects.toThrow(
      'URL not allowed'
    );
  });

  it('should reject AWS metadata endpoint', async () => {
    await expect(
      validateAndResolveUrl('http://169.254.169.254/latest/meta-data/')
    ).rejects.toThrow('URL not allowed');
  });

  it('should reject GCP metadata endpoint', async () => {
    await expect(
      validateAndResolveUrl('http://metadata.google.internal/computeMetadata/v1/')
    ).rejects.toThrow('URL not allowed');
  });

  it('should reject URL resolving to 127.0.0.1', async () => {
    mockResolve4.mockResolvedValue(['127.0.0.1']);
    mockResolve6.mockRejectedValue(new Error('No IPv6'));

    await expect(validateAndResolveUrl('http://evil.com/page.html')).rejects.toThrow(
      'URL resolves to blocked IP'
    );
  });

  it('should reject URL resolving to 10.x.x.x (private range)', async () => {
    mockResolve4.mockResolvedValue(['10.0.0.1']);
    mockResolve6.mockRejectedValue(new Error('No IPv6'));

    await expect(
      validateAndResolveUrl('http://internal.example.com/page.html')
    ).rejects.toThrow('URL resolves to blocked IP');
  });

  it('should reject URL resolving to 192.168.x.x', async () => {
    mockResolve4.mockResolvedValue(['192.168.1.1']);
    mockResolve6.mockRejectedValue(new Error('No IPv6'));

    await expect(
      validateAndResolveUrl('http://router.local/page.html')
    ).rejects.toThrow('URL resolves to blocked IP');
  });

  it('should reject URL resolving to 172.16-31.x.x (172.16.x.x)', async () => {
    mockResolve4.mockResolvedValue(['172.16.0.1']);
    mockResolve6.mockRejectedValue(new Error('No IPv6'));

    await expect(
      validateAndResolveUrl('http://internal.corp/page.html')
    ).rejects.toThrow('URL resolves to blocked IP');
  });

  it('should reject URL resolving to 172.16-31.x.x (172.20.x.x)', async () => {
    mockResolve4.mockResolvedValue(['172.20.5.10']);
    mockResolve6.mockRejectedValue(new Error('No IPv6'));

    await expect(
      validateAndResolveUrl('http://internal.corp/page.html')
    ).rejects.toThrow('URL resolves to blocked IP');
  });

  it('should reject URL resolving to 172.16-31.x.x (172.31.x.x)', async () => {
    mockResolve4.mockResolvedValue(['172.31.255.255']);
    mockResolve6.mockRejectedValue(new Error('No IPv6'));

    await expect(
      validateAndResolveUrl('http://internal.corp/page.html')
    ).rejects.toThrow('URL resolves to blocked IP');
  });

  it('should reject URL resolving to link-local 169.254.x.x', async () => {
    mockResolve4.mockResolvedValue(['169.254.1.1']);
    mockResolve6.mockRejectedValue(new Error('No IPv6'));

    await expect(
      validateAndResolveUrl('http://link-local.example.com/page.html')
    ).rejects.toThrow('URL resolves to blocked IP');
  });

  it('should reject DNS resolution failure', async () => {
    mockResolve4.mockRejectedValue(new Error('DNS failed'));
    mockResolve6.mockRejectedValue(new Error('DNS failed'));

    await expect(
      validateAndResolveUrl('http://nonexistent.example.com/page.html')
    ).rejects.toThrow('Could not resolve hostname');
  });

  it('should accept valid URL with only IPv6', async () => {
    mockResolve4.mockRejectedValue(new Error('No IPv4'));
    mockResolve6.mockResolvedValue(['2606:4700:4700::1111']);

    const result = await validateAndResolveUrl('https://cloudflare.com/page.html');
    expect(result.url).toBe('https://cloudflare.com/page.html');
    expect(result.resolvedIp).toBe('2606:4700:4700::1111');
    expect(result.hostname).toBe('cloudflare.com');
  });

  it('should accept valid URL with both IPv4 and IPv6', async () => {
    mockResolve4.mockResolvedValue(['1.1.1.1']);
    mockResolve6.mockResolvedValue(['2606:4700:4700::1111']);

    const result = await validateAndResolveUrl('https://cloudflare.com/page.html');
    expect(result.url).toBe('https://cloudflare.com/page.html');
    expect(result.resolvedIp).toBe('1.1.1.1'); // IPv4 preferred
    expect(result.hostname).toBe('cloudflare.com');
  });

  it('should reject if any resolved IP is blocked', async () => {
    mockResolve4.mockResolvedValue(['8.8.8.8', '127.0.0.1']);
    mockResolve6.mockRejectedValue(new Error('No IPv6'));

    await expect(
      validateAndResolveUrl('http://mixed-ips.example.com/page.html')
    ).rejects.toThrow('URL resolves to blocked IP');
  });
});

describe('isBlockedIP', () => {
  describe('Private IPv4 ranges', () => {
    it('should block 127.x.x.x (loopback)', () => {
      expect(isBlockedIP('127.0.0.1')).toBe(true);
      expect(isBlockedIP('127.1.2.3')).toBe(true);
      expect(isBlockedIP('127.255.255.255')).toBe(true);
    });

    it('should block 10.x.x.x (Class A private)', () => {
      expect(isBlockedIP('10.0.0.1')).toBe(true);
      expect(isBlockedIP('10.255.255.255')).toBe(true);
      expect(isBlockedIP('10.123.45.67')).toBe(true);
    });

    it('should block 192.168.x.x (Class C private)', () => {
      expect(isBlockedIP('192.168.0.1')).toBe(true);
      expect(isBlockedIP('192.168.255.255')).toBe(true);
      expect(isBlockedIP('192.168.1.100')).toBe(true);
    });

    it('should block 172.16-31.x.x (Class B private)', () => {
      expect(isBlockedIP('172.16.0.1')).toBe(true);
      expect(isBlockedIP('172.17.5.10')).toBe(true);
      expect(isBlockedIP('172.20.100.50')).toBe(true);
      expect(isBlockedIP('172.31.255.255')).toBe(true);
    });

    it('should block 169.254.x.x (link-local)', () => {
      expect(isBlockedIP('169.254.0.1')).toBe(true);
      expect(isBlockedIP('169.254.169.254')).toBe(true);
      expect(isBlockedIP('169.254.255.255')).toBe(true);
    });

    it('should block 0.x.x.x (reserved)', () => {
      expect(isBlockedIP('0.0.0.0')).toBe(true);
      expect(isBlockedIP('0.1.2.3')).toBe(true);
    });
  });

  describe('Public IPv4', () => {
    it('should allow public IPs', () => {
      expect(isBlockedIP('8.8.8.8')).toBe(false);
      expect(isBlockedIP('1.1.1.1')).toBe(false);
      expect(isBlockedIP('93.184.216.34')).toBe(false); // example.com
      expect(isBlockedIP('172.15.0.1')).toBe(false); // Just before 172.16
      expect(isBlockedIP('172.32.0.1')).toBe(false); // Just after 172.31
    });
  });

  describe('IPv6 loopback', () => {
    it('should block ::1 (loopback)', () => {
      expect(isBlockedIP('::1')).toBe(true);
    });

    it('should block :: (unspecified)', () => {
      expect(isBlockedIP('::')).toBe(true);
    });
  });

  describe('IPv6 link-local', () => {
    it('should block fe80:: prefix', () => {
      expect(isBlockedIP('fe80::1')).toBe(true);
      expect(isBlockedIP('fe80::abcd:ef12:3456:7890')).toBe(true);
      expect(isBlockedIP('FE80::1')).toBe(true); // Case insensitive
    });
  });

  describe('IPv6 unique local', () => {
    it('should block fc00:: prefix', () => {
      expect(isBlockedIP('fc00::1')).toBe(true);
      expect(isBlockedIP('fc12::abcd')).toBe(true);
      expect(isBlockedIP('FC00::1')).toBe(true); // Case insensitive
    });

    it('should block fd00:: prefix', () => {
      expect(isBlockedIP('fd00::1')).toBe(true);
      expect(isBlockedIP('fd12::abcd')).toBe(true);
      expect(isBlockedIP('FD00::1')).toBe(true); // Case insensitive
    });
  });

  describe('IPv4-mapped IPv6', () => {
    it('should block ::ffff:127.0.0.1', () => {
      expect(isBlockedIP('::ffff:127.0.0.1')).toBe(true);
      expect(isBlockedIP('::FFFF:127.0.0.1')).toBe(true); // Case insensitive
    });

    it('should block ::ffff:10.0.0.1', () => {
      expect(isBlockedIP('::ffff:10.0.0.1')).toBe(true);
    });

    it('should block ::ffff:192.168.1.1', () => {
      expect(isBlockedIP('::ffff:192.168.1.1')).toBe(true);
    });

    it('should allow ::ffff:8.8.8.8 (public IP)', () => {
      expect(isBlockedIP('::ffff:8.8.8.8')).toBe(false);
    });
  });

  describe('Decimal IP encoding', () => {
    it('should block decimal-encoded IPs', () => {
      // 127.0.0.1 = 2130706433
      expect(isBlockedIP('2130706433')).toBe(true);
      // Any 8-10 digit number
      expect(isBlockedIP('12345678')).toBe(true);
      expect(isBlockedIP('1234567890')).toBe(true);
    });

    it('should not block non-decimal strings', () => {
      expect(isBlockedIP('1234567')).toBe(false); // Too short
      expect(isBlockedIP('12345678901')).toBe(false); // Too long
    });
  });

  describe('Hex IP encoding', () => {
    it('should block hex-encoded IPs', () => {
      // 0x7f000001 = 127.0.0.1
      expect(isBlockedIP('0x7f000001')).toBe(true);
      expect(isBlockedIP('0x0a000001')).toBe(true); // 10.0.0.1
      expect(isBlockedIP('0xC0A80101')).toBe(true); // 192.168.1.1
      expect(isBlockedIP('0XC0A80101')).toBe(true); // Case insensitive
    });

    it('should not block invalid hex formats', () => {
      expect(isBlockedIP('0x12345')).toBe(false); // Too short
      expect(isBlockedIP('0x123456789')).toBe(false); // Too long
      expect(isBlockedIP('0xGGGGGGGG')).toBe(false); // Invalid hex
    });
  });

  describe('Public IPv6', () => {
    it('should allow public IPv6 addresses', () => {
      expect(isBlockedIP('2606:4700:4700::1111')).toBe(false); // Cloudflare
      expect(isBlockedIP('2001:4860:4860::8888')).toBe(false); // Google
      expect(isBlockedIP('2a00:1450:4001::68')).toBe(false); // Google
    });
  });
});
