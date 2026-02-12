import { NextResponse } from "next/server";
import { cookies } from "next/headers";

function isAdminFromCookie() {
  // 依你先前的設計：登入後會 set mf_admin=1 (HttpOnly)
  const v = cookies().get("mf_admin")?.value;
  return v === "1";
}

export async function GET() {
  if (!isAdminFromCookie()) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}
