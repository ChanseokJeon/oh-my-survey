// src/lib/theme/website/validator.ts

import dns from 'dns/promises';

interface ValidatedUrl {
  url: string;
  resolvedIp: string;
  hostname: string;
}

export const BLOCKED_HOSTS = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '169.254.169.254',
  'metadata.google.internal',
];

const DNS_TIMEOUT_MS = 5000;

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(message)), ms)
    )
  ]);
}

export async function validateAndResolveUrl(url: string): Promise<ValidatedUrl> {
  if (url.length > 2048) {
    throw new Error('URL too long');
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('Invalid URL');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Only HTTP/HTTPS allowed');
  }

  if (BLOCKED_HOSTS.includes(parsed.hostname.toLowerCase())) {
    throw new Error('URL not allowed');
  }

  let addresses4: string[] = [];
  let addresses6: string[] = [];

  try {
    addresses4 = await withTimeout(
      dns.resolve4(parsed.hostname),
      DNS_TIMEOUT_MS,
      'DNS resolution timeout'
    );
  } catch {
    // IPv4 resolution failed, continue
  }

  try {
    addresses6 = await withTimeout(
      dns.resolve6(parsed.hostname),
      DNS_TIMEOUT_MS,
      'DNS resolution timeout'
    );
  } catch {
    // IPv6 resolution failed, continue
  }

  const allAddresses = [...addresses4, ...addresses6];
  if (allAddresses.length === 0) {
    throw new Error('Could not resolve hostname');
  }

  for (const ip of allAddresses) {
    if (isBlockedIP(ip)) {
      throw new Error('URL resolves to blocked IP');
    }
  }

  return {
    url: parsed.href,
    resolvedIp: addresses4[0] || addresses6[0],
    hostname: parsed.hostname,
  };
}

export function isBlockedIP(ip: string): boolean {
  if (ip.toLowerCase().startsWith('::ffff:')) {
    const ipv4Part = ip.slice(7);
    return isBlockedIP(ipv4Part);
  }

  if (ip.match(/^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0\.)/)) {
    return true;
  }

  if (/^\d{8,10}$/.test(ip)) {
    return true;
  }

  if (/^0x[0-9a-f]{8}$/i.test(ip)) {
    return true;
  }

  if (ip === '::1' || ip === '::') {
    return true;
  }

  if (ip.toLowerCase().startsWith('fe80:')) {
    return true;
  }

  if (ip.toLowerCase().startsWith('fc') || ip.toLowerCase().startsWith('fd')) {
    return true;
  }

  return false;
}
