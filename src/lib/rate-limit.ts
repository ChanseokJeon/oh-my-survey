const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

const LIMITS = {
  extractTheme: { perUser: 10, perIP: 30, windowMs: 60000 }, // per minute
};

export function checkRateLimit(
  type: keyof typeof LIMITS,
  userId: string,
  ip: string
): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const config = LIMITS[type];

  // User-based limit
  const userKey = `${type}:user:${userId}`;
  const userEntry = rateLimitStore.get(userKey);
  if (userEntry && userEntry.resetAt > now && userEntry.count >= config.perUser) {
    return { allowed: false, retryAfter: Math.ceil((userEntry.resetAt - now) / 1000) };
  }

  // IP-based limit
  const ipKey = `${type}:ip:${ip}`;
  const ipEntry = rateLimitStore.get(ipKey);
  if (ipEntry && ipEntry.resetAt > now && ipEntry.count >= config.perIP) {
    return { allowed: false, retryAfter: Math.ceil((ipEntry.resetAt - now) / 1000) };
  }

  // Increment counters
  incrementCounter(userKey, config.windowMs);
  incrementCounter(ipKey, config.windowMs);

  return { allowed: true };
}

function incrementCounter(key: string, windowMs: number) {
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  if (!entry || entry.resetAt <= now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
  } else {
    entry.count++;
  }
}

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000);
