import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1️⃣ 讀最新 NAV snapshot
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
    const nav_ts = navRow?.timestamp ?? null;
    const snapshot_id = navRow?.snapshot_id ?? null;

    // 2️⃣ 讀 pool_state（freeze 狀態）
    const { data: state } = await supabase
      .from("pool_state")
      .select('"freeze"')
      .eq("id", 1)
      .single();

    const freeze = state?.freeze ?? false;

    // 3️⃣ 計算全體 principal（如果還沒做 investor_accounts 就先給 0）
    let total_principal_usd = 0;

    const { data: principals } = await supabase
      .from("investor_accounts")
      .select("principal_remaining_usd");

    if (principals) {
      total_principal_usd = principals.reduce(
        (sum, r) => sum + Number(r.principal_remaining_usd ?? 0),
        0
      );
    }

    // 4️⃣ 計算 WTD（你如果已有邏輯可替換）
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
