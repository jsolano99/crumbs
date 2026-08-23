import { getSessionEmail } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const email = await getSessionEmail();
  return Response.json({ email });
}
