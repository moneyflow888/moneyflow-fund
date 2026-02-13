import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getBearer(req: Request): string | null {
  const h = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!h) return null;
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m?.[1] ?? null;
}

export async function POST(req: Request) {
  try {
    const token = getBearer(req);
    if (!token) return NextResponse.json({ error: "Missing Authorization Bearer token" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const amount_usd = Number(body?.amount_usd);
    const note = typeof body?.note === "string" ? body.note : null;

    if (!Number.isFinite(amount_usd) || amount_usd <= 0) {
      return NextResponse.json({ error: "amount_usd must be a positive number" }, { status: 400 });
    }

    // ✅ server route uses anon + user JWT (RLS applies)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const { data: userRes, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userRes?.user) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const { data, error } = await supabase
      .from("investor_deposit_requests")
      .insert([{ user_id: userRes.user.id, amount_usd, status: "PENDING", note }])
      .select("id,user_id,amount_usd,status,note,created_at")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, row: data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
