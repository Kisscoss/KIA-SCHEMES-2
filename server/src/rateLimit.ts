import type { Request, Response, NextFunction } from "express";

/**
 * Minimal in-memory fixed-window rate limiter. Dependency-free so it works the
 * same in the long-running Express server and the Vercel serverless function.
 *
 * Caveat: state lives in the process, so buckets reset on cold starts / are not
 * shared across serverless instances. That is a deliberate best-effort trade-off
 * (matching the "best-effort on serverless" note in the README) — for a hard
 * cross-instance limit you would back this with Redis/Upstash.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

export interface RateLimitOptions {
  /** Length of the window in milliseconds. */
  windowMs: number;
  /** Max requests allowed per key within the window. */
  max: number;
  /** Derives the bucket key (defaults to the client IP). */
  keyGenerator?: (req: Request) => string;
  /** Error message returned with HTTP 429. */
  message?: string;
}

export function rateLimit(opts: RateLimitOptions) {
  const buckets = new Map<string, Bucket>();
  const keyFor = opts.keyGenerator ?? ((req: Request) => req.ip ?? "unknown");

  // Periodically drop expired buckets so the map cannot grow unbounded.
  // unref() so the timer never keeps the process alive.
  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  }, Math.min(opts.windowMs, 60_000));
  sweep.unref?.();

  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyFor(req);
    const now = Date.now();
    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + opts.windowMs };
      buckets.set(key, bucket);
    }
    bucket.count += 1;

    const remaining = Math.max(0, opts.max - bucket.count);
    const resetSec = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    res.setHeader("RateLimit-Limit", String(opts.max));
    res.setHeader("RateLimit-Remaining", String(remaining));
    res.setHeader("RateLimit-Reset", String(resetSec));

    if (bucket.count > opts.max) {
      res.setHeader("Retry-After", String(resetSec));
      return res.status(429).json({
        error:
          opts.message ?? "Rate limited. Too many requests — please try again shortly.",
      });
    }
    next();
  };
}
