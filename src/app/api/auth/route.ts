import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = (await req.json()) as { email?: string };
  if (!body.email || !body.email.includes("@")) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  // Demo auth for Shipaton — replace with Clerk/Supabase Auth later
  return NextResponse.json({
    ok: true,
    user: { email: body.email, id: `user_${Buffer.from(body.email).toString("base64url").slice(0, 12)}` },
  });
}
