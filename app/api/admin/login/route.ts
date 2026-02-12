import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const password = body?.password;

  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "INVALID_PASSWORD" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });

  // 設定 HttpOnly cookie（12 小時）
  res.cookies.set("mf_admin", "1", {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: 60 * 60 * 12,
    path: "/",
  });

  return res;
}
