import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function sb() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !key) throw new Error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET() {
  try {
    const supabase = sb();

    const r = await supabase
      .from("nav_snapshots")
      .select("id, ts, nav_usd")
      .order("ts", { ascending: false })
      .order("id", { ascending: false })
      .limit(1);

    if (r.error) throw new Error(r.error.message);
    const row = r.data?.[0];

    return NextResponse.json({
      nav_usd: row?.nav_usd ?? 0,
      nav_ts: row?.ts ?? null,
      wtd_usd: 0,                 // 先給 0，下一步再做 WTD 真運算
      total_principal_usd: 0,      // 你之後再接 investor principal
      freeze: false,
      snapshot_id: row?.id ?? null,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}
