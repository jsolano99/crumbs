import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { redis } from "./redis";

const SESSION_COOKIE = "crumbs_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
const BCRYPT_COST = 12;

export type User = {
  email: string;
  passwordHash: string;
  createdAt: string;
};

function userKey(email: string) {
  return `user:${email.trim().toLowerCase()}`;
}

function sessionKey(token: string) {
  return `session:${token}`;
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidPassword(password: string): boolean {
  return typeof password === "string" && password.length >= 8 && password.length <= 200;
}

export async function getUser(email: string): Promise<User | null> {
  if (!redis) return null;
  const user = await redis.get<User>(userKey(email));
  return user ?? null;
}

export async function createUser(email: string, password: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!redis) return { ok: false, error: "Accounts aren't configured on this deployment yet." };

  const normalizedEmail = email.trim().toLowerCase();
  if (!isValidEmail(normalizedEmail)) return { ok: false, error: "That doesn't look like a valid email." };
  if (!isValidPassword(password)) return { ok: false, error: "Password needs to be at least 8 characters." };

  const existing = await getUser(normalizedEmail);
  if (existing) return { ok: false, error: "An account with that email already exists." };

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  const user: User = { email: normalizedEmail, passwordHash, createdAt: new Date().toISOString() };
  await redis.set(userKey(normalizedEmail), user);
  return { ok: true };
}

export async function verifyCredentials(
  email: string,
  password: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await getUser(normalizedEmail);
  if (!user) return { ok: false, error: "Incorrect email or password." };

  const matches = await bcrypt.compare(password, user.passwordHash);
  if (!matches) return { ok: false, error: "Incorrect email or password." };

  return { ok: true };
}

export async function createSession(email: string): Promise<void> {
  if (!redis) return;
  const normalizedEmail = email.trim().toLowerCase();
  const token = crypto.randomUUID();
  await redis.set(sessionKey(token), normalizedEmail, { ex: SESSION_TTL_SECONDS });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function getSessionEmail(): Promise<string | null> {
  if (!redis) return null;
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const email = await redis.get<string>(sessionKey(token));
  return email ?? null;
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token && redis) {
    await redis.del(sessionKey(token));
  }
  cookieStore.delete(SESSION_COOKIE);
}
