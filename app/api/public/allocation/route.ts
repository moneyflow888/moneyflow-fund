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

    const latest = await supabase
      .from("nav_snapshots")
      .select("id")
      .order("ts", { ascending: false })
      .order("id", { ascending: false })
      .limit(1);

    if (latest.error) throw new Error(latest.error.message);
    const snapshotId = latest.data?.[0]?.id;
    if (!snapshotId) return NextResponse.json({ rows: [], snapshot_id: null });

    const r = await supabase
      .from("position_snapshots")
      .select("category, value_usd")
      .eq("nav_snapshot_id", snapshotId)
      .limit(5000);

    if (r.error) throw new Error(r.error.message);

    const m = new Map<string, number>();
    for (const x of r.data ?? []) {
      const cat = String((x as any).category ?? "unknown");
      const v = Number((x as any).value_usd ?? 0) || 0;
      m.set(cat, (m.get(cat) ?? 0) + v);
    }

    const rows = Array.from(m.entries())
      .map(([category, value_usdt]) => ({ category, label: category, value_usdt }))
      .sort((a, b) => b.value_usdt - a.value_usdt);

    return NextResponse.json({ rows, snapshot_id: snapshotId });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}
