import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1) 最新 NAV（你的表：id / ts / nav_usd）
    const { data: navRow, error: navErr } = await supabase
      .from("nav_snapshots")
      .select("id, ts, nav_usd")
      .order("ts", { ascending: false })
      .limit(1)
      .single();

    if (navErr) {
      return NextResponse.json({ error: navErr.message }, { status: 500 });
    }

    const nav_usd = Number((navRow as any)?.nav_usd ?? 0);
    const nav_ts = (navRow as any)?.ts ?? null;
    const snapshot_id = (navRow as any)?.id ?? null;

    // 2) 讀 pool_state.freeze
    const { data: state, error: stateErr } = await supabase
      .from("pool_state")
      .select("freeze")
      .eq("id", 1)
      .single();

    const freeze = stateErr ? false : Boolean((state as any)?.freeze);

    // 3) 全體 principal（你還沒做 investor_accounts 就會是 0；也避免炸）
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

    // 4) WTD 先 0（你之後再補真實算法）
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
