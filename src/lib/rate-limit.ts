/**
 * Simple in-memory rate limiter for API routes
 * 
 * SECURITY: This provides basic protection against abuse.
 * For production at scale, consider:
 * - Redis-based rate limiting (upstash/ratelimit)
 * - Vercel's built-in rate limiting
 * - Cloudflare rate limiting
 * 
 * Note: In-memory rate limiting won't work across serverless function instances,
 * but it provides protection within each instance and is better than nothing.
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// Store rate limit data in memory (per-instance)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean every minute

export interface RateLimitConfig {
  maxRequests: number;  // Maximum requests allowed
  windowMs: number;     // Time window in milliseconds
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetTime: number;
}

/**
 * Check if a request should be rate limited
 * @param identifier - Unique identifier for the client (IP, user ID, etc.)
 * @param config - Rate limit configuration
 * @returns RateLimitResult indicating if request should proceed
 */
export function rateLimit(identifier: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const key = identifier;
  
  let entry = rateLimitStore.get(key);
  
  // If no entry or window expired, create new entry
  if (!entry || entry.resetTime < now) {
    entry = {
      count: 1,
      resetTime: now + config.windowMs,
    };
    rateLimitStore.set(key, entry);
    
    return {
      success: true,
      remaining: config.maxRequests - 1,
      resetTime: entry.resetTime,
    };
  }
  
  // Increment count
  entry.count++;
  
  // Check if over limit
  if (entry.count > config.maxRequests) {
    return {
      success: false,
      remaining: 0,
      resetTime: entry.resetTime,
    };
  }
  
  return {
    success: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime,
  };
}

/**
 * Get client IP from request headers
 * Works with Vercel, Cloudflare, and standard proxies
 */
export function getClientIP(headers: Headers): string {
  // Check various headers for client IP (in order of preference)
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwardedFor.split(',')[0].trim();
  }
  
  const realIP = headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  
  const cfConnectingIP = headers.get('cf-connecting-ip');
  if (cfConnectingIP) {
    return cfConnectingIP;
  }
  
  // Fallback - this shouldn't happen in production with proper proxy setup
  return 'unknown';
}

// Predefined rate limit configurations
export const RATE_LIMITS = {
  // Strict limit for file uploads (5 per minute)
  UPLOAD: { maxRequests: 5, windowMs: 60 * 1000 },
  
  // Processing requests (3 per minute)
  PROCESS: { maxRequests: 3, windowMs: 60 * 1000 },
  
  // Read operations (60 per minute)
  READ: { maxRequests: 60, windowMs: 60 * 1000 },
  
  // Write/update operations (10 per minute)
  WRITE: { maxRequests: 10, windowMs: 60 * 1000 },
  
  // General API (30 per minute)
  GENERAL: { maxRequests: 30, windowMs: 60 * 1000 },
};

