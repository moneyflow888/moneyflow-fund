import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1) 最新 NAV snapshot
    const { data: navRow, error: navErr } = await supabase
      .from("nav_snapshots")
      .select("*")
      .order("snapshot_id", { ascending: false })
      .limit(1)
      .single();

    if (navErr) {
      return NextResponse.json({ error: navErr.message }, { status: 500 });
    }

    const nav_usd = Number(navRow?.total_nav ?? 0);
    const nav_ts = (navRow as any)?.timestamp ?? null;
    const snapshot_id = (navRow as any)?.snapshot_id ?? null;

    // 2) 讀 pool_state.freeze
    const { data: state, error: stateErr } = await supabase
      .from("pool_state")
      .select("freeze")
      .eq("id", 1)
      .single();

    // 讀不到就容錯為 false（避免 public api 爆掉）
    const freeze = stateErr ? false : Boolean((state as any)?.freeze);

    // 3) 全體 principal（如果 investor_accounts / 欄位還沒做，容錯為 0）
    let total_principal_usd = 0;

    const { data: principals, error: pErr } = await supabase
      .from("investor_accounts")
      .select("principal_remaining_usd");

    if (!pErr && principals) {
      total_principal_usd = (principals as any[]).reduce(
        (sum, r) => sum + Number(r?.principal_remaining_usd ?? 0),
        0
      );
    }

    // 4) WTD（你之後可換成真實算法）
    const wtd_usd = 0;

    return NextResponse.json({
      nav_usd,
      nav_ts,
      wtd_usd,
      total_principal_usd,
      freeze,
      snapshot_id,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
