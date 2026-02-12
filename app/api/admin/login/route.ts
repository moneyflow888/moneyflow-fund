import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    // 讀取 request body
    const body = await req.json().catch(() => null);
    const password = body?.password;

    // 基本檢查
    if (!password) {
      return NextResponse.json(
        { error: "PASSWORD_REQUIRED" },
        { status: 400 }
      );
    }

    // 驗證密碼（從 Vercel 環境變數讀取）
    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: "INVALID_PASSWORD" },
        { status: 401 }
      );
    }

    // 建立回應
    const res = NextResponse.json({ ok: true });

    // 設定 admin cookie（12 小時有效）
    res.cookies.set("mf_admin", "1", {
      httpOnly: true,
      secure: true,       // production 必須 true
      sameSite: "strict",
      maxAge: 60 * 60 * 12, // 12 小時
      path: "/",
    });

    return res;

  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "UNKNOWN_ERROR" },
      { status: 500 }
    );
  }
}
