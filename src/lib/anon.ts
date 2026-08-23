import { cookies } from "next/headers";

const ANON_COOKIE = "crumbs_anon_id";
const ANON_TTL_SECONDS = 60 * 60 * 24 * 365;

/** Gets this device's persistent anonymous id, creating one if it doesn't have it yet. */
export async function getOrCreateAnonId(): Promise<string> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(ANON_COOKIE)?.value;
  if (existing) return existing;

  const id = crypto.randomUUID();
  cookieStore.set(ANON_COOKIE, id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ANON_TTL_SECONDS,
  });
  return id;
}
