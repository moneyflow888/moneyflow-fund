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
      .select("ts, nav_usd")
      .order("ts", { ascending: true })
      .order("id", { ascending: true })
      .limit(2000);

    if (r.error) throw new Error(r.error.message);

    const rows = (r.data ?? []).map((x: any) => ({
      timestamp: String(x.ts),
      total_nav: Number(x.nav_usd) || 0,
    }));

    return NextResponse.json({ rows });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}
