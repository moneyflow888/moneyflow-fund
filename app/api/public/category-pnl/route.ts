import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function sb() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !key) throw new Error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

type Row = {
  category: string;
  value_usd: number;
  pnl_now: number; // vs prev snapshot
  pnl_24h: number; // vs 24h-ago snapshot
  pnl_wtd: number; // vs Sunday 00:00 (Taipei) anchor snapshot
};

function num(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

const TZ = "Asia/Taipei";

// 以台北時區算「本週日 00:00」
function taipeiSundayStartISO(now = new Date()) {
  const taipeiNow = new Date(now.toLocaleString("en-US", { timeZone: TZ }));
  const day = taipeiNow.getDay(); // 0=Sun ... 6=Sat
  const sunday = new Date(taipeiNow);
  sunday.setHours(0, 0, 0, 0);
  sunday.setDate(sunday.getDate() - day);
  return sunday.toISOString();
}

export async function GET() {
  try {
    const supabase = sb();

    // 1) latest snapshot (真相來源)
    const latest = await supabase
      .from("nav_snapshots")
      .select("id, ts")
      .order("ts", { ascending: false })
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latest.error) throw new Error(latest.error.message);
    if (!latest.data?.id) return NextResponse.json({ rows: [] });

    const latestId = Number(latest.data.id);

    // 2) prev snapshot（上一筆）=> pnl_now
    const prev = await supabase
      .from("nav_snapshots")
      .select("id")
      .lt("id", latestId)
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();

    const prevId = prev.data?.id ? Number(prev.data.id) : null;

    // 3) 24h ago snapshot => pnl_24h
    const prev24 = await supabase
      .from("nav_snapshots")
      .select("id")
      .lte("ts", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order("ts", { ascending: false })
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();

    const prev24Id = prev24.data?.id ? Number(prev24.data.id) : null;

    // 4) WTD anchor snapshot (<= 台北週日00:00) => pnl_wtd
    const wtdAnchorISO = taipeiSundayStartISO(new Date());

    const prevWtd = await supabase
      .from("nav_snapshots")
      .select("id")
      .lte("ts", wtdAnchorISO)
      .order("ts", { ascending: false })
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();

    const prevWtdId = prevWtd.data?.id ? Number(prevWtd.data.id) : null;

    // helper: sum(value_usd) by category for a snapshot_id
    async function sumByCategory(snapshotId: number) {
      const r = await supabase
        .from("position_snapshots")
        .select("category, value_usd")
        .eq("nav_snapshot_id", snapshotId);

      if (r.error) throw new Error(r.error.message);

      const m = new Map<string, number>();
      for (const x of r.data ?? []) {
        const cat = String((x as any).category ?? "unknown");
        const v = num((x as any).value_usd);
        m.set(cat, (m.get(cat) ?? 0) + v);
      }
      return m;
    }

    const nowMap = await sumByCategory(latestId);
    const prevMap = prevId ? await sumByCategory(prevId) : new Map<string, number>();
    const prev24Map = prev24Id ? await sumByCategory(prev24Id) : new Map<string, number>();
    const prevWtdMap = prevWtdId ? await sumByCategory(prevWtdId) : new Map<string, number>();

    const categories = Array.from(
      new Set([...nowMap.keys(), ...prevMap.keys(), ...prev24Map.keys(), ...prevWtdMap.keys()])
    );

    const rows: Row[] = categories
      .map((category) => {
        const vNow = nowMap.get(category) ?? 0;
        const vPrev = prevMap.get(category) ?? 0;
        const v24 = prev24Map.get(category) ?? 0;
        const vW = prevWtdMap.get(category) ?? 0;

        return {
          category,
          value_usd: vNow,
          pnl_now: vNow - vPrev,
          pnl_24h: vNow - v24,
          pnl_wtd: vNow - vW,
        };
      })
      .sort((a, b) => b.value_usd - a.value_usd);

    return NextResponse.json({
      snapshot_id: latestId,
      prev_snapshot_id: prevId,
      prev_24h_snapshot_id: prev24Id,
      wtd_anchor_snapshot_id: prevWtdId,
      wtd_anchor_iso: wtdAnchorISO,
      rows,
      note: `source=position_snapshots(nav_snapshot_id=latest), NAV truth=nav_snapshots latest`,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}
