import type { NextRequest } from "next/server";
import { verifyCredentials, createSession } from "@/lib/auth";
import { checkAuthRateLimit, getClientIp, recordAuthAttempt } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = await checkAuthRateLimit(ip);
  if (!rateLimit.allowed) {
    return Response.json({ error: "Too many attempts. Try again in a bit." }, { status: 429 });
  }
  await recordAuthAttempt(ip);

  let email = "";
  let password = "";
  try {
    const body = await request.json();
    email = typeof body?.email === "string" ? body.email : "";
    password = typeof body?.password === "string" ? body.password : "";
  } catch {
    return Response.json({ error: "Couldn't read that request." }, { status: 400 });
  }

  const result = await verifyCredentials(email, password);
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 401 });
  }

  await createSession(email);
  return Response.json({ ok: true, email: email.trim().toLowerCase() });
}
