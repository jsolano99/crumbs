import type { NextRequest } from "next/server";
import { redis } from "./redis";

const FREE_TRIES_PER_DEVICE = 1;
const FREE_GRANTS_PER_IP_PER_DAY = 5;
const BREAKDOWNS_PER_USER_PER_DAY = 50;
const AUTH_ATTEMPTS_PER_IP_PER_HOUR = 20;

const DAY_SECONDS = 60 * 60 * 26; // a day plus buffer, so the window never resets mid-use
const HOUR_SECONDS = 60 * 70; // an hour plus buffer

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function hourKey(): string {
  return new Date().toISOString().slice(0, 13);
}

export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

async function incrWithExpiry(key: string, ttlSeconds: number): Promise<number> {
  if (!redis) return 0;
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, ttlSeconds);
  }
  return count;
}

/**
 * Anonymous (pre-signup) quota: one free breakdown per device, backstopped by a
 * per-IP daily cap on how many free tries can be granted at all (so clearing
 * cookies from one IP doesn't buy unlimited free tries).
 */
export async function checkAnonymousQuota(
  anonId: string,
  ip: string
): Promise<{ allowed: true } | { allowed: false; reason: "device" | "ip" }> {
  if (!redis) return { allowed: true };

  const deviceUsed = await redis.get<number>(`anon_used:${anonId}`);
  if ((deviceUsed ?? 0) >= FREE_TRIES_PER_DEVICE) {
    return { allowed: false, reason: "device" };
  }

  const ipGrants = await redis.get<number>(`ip_free:${ip}:${todayKey()}`);
  if ((ipGrants ?? 0) >= FREE_GRANTS_PER_IP_PER_DAY) {
    return { allowed: false, reason: "ip" };
  }

  return { allowed: true };
}

export async function recordAnonymousUse(anonId: string, ip: string): Promise<void> {
  if (!redis) return;
  await redis.set(`anon_used:${anonId}`, 1, { ex: 60 * 60 * 24 * 365 });
  await incrWithExpiry(`ip_free:${ip}:${todayKey()}`, DAY_SECONDS);
}

/**
 * Signed-in quota: a generous daily cap per account so one runaway or
 * compromised account can't drive unbounded model spend.
 */
export async function checkUserQuota(email: string): Promise<{ allowed: true } | { allowed: false }> {
  if (!redis) return { allowed: true };
  const used = await redis.get<number>(`user_daily:${email}:${todayKey()}`);
  if ((used ?? 0) >= BREAKDOWNS_PER_USER_PER_DAY) return { allowed: false };
  return { allowed: true };
}

export async function recordUserUse(email: string): Promise<void> {
  if (!redis) return;
  await incrWithExpiry(`user_daily:${email}:${todayKey()}`, DAY_SECONDS);
}

/** Throttle signup/login attempts per IP to blunt credential stuffing and signup spam. */
export async function checkAuthRateLimit(ip: string): Promise<{ allowed: true } | { allowed: false }> {
  if (!redis) return { allowed: true };
  const attempts = await redis.get<number>(`auth_attempts:${ip}:${hourKey()}`);
  if ((attempts ?? 0) >= AUTH_ATTEMPTS_PER_IP_PER_HOUR) return { allowed: false };
  return { allowed: true };
}

export async function recordAuthAttempt(ip: string): Promise<void> {
  if (!redis) return;
  await incrWithExpiry(`auth_attempts:${ip}:${hourKey()}`, HOUR_SECONDS);
}
