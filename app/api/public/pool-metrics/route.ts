import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1) 最新 NAV snapshot（用 timestamp 排序，避免 snapshot_id 不存在）
    const { data: navRow, error: navErr } = await supabase
      .from("nav_snapshots")
      .select("*")
      .order("timestamp", { ascending: false })
      .limit(1)
      .single();

    if (navErr) {
      return NextResponse.json({ error: navErr.message }, { status: 500 });
    }

    const nav_usd = Number((navRow as any)?.total_nav ?? 0);
    const nav_ts = (navRow as any)?.timestamp ?? null;

    // snapshot_id 可能不存在：容錯（你有就回傳，沒有就 null）
    const snapshot_id =
      (navRow as any)?.snapshot_id ??
      (navRow as any)?.id ??
      null;

    // 2) 讀 pool_state.freeze
    const { data: state } = await supabase
      .from("pool_state")
      .select("freeze")
      .eq("id", 1)
      .single();

    const freeze = Boolean((state as any)?.freeze ?? false);

    // 3) 全體 principal：你還沒做 investor_accounts 就先容錯為 0
    let total_principal_usd = 0;
    const { data: principals } = await supabase
      .from("investor_accounts")
      .select("principal_remaining_usd");

    if (principals) {
      total_principal_usd = (principals as any[]).reduce(
        (sum, r) => sum + Number(r?.principal_remaining_usd ?? 0),
        0
      );
    }

    // 4) WTD 先 0
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
