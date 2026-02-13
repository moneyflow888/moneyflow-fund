// app/api/investor/ledger/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function toNumber(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

// 依序挑可用的金額欄位（你 DB 用哪個都可以）
function pickAmount(row: any): number {
  if (row && row.amount_usd != null) return toNumber(row.amount_usd);
  if (row && row.amount_u != null) return toNumber(row.amount_u);
  if (row && row.amount != null) return toNumber(row.amount);
  return 0;
}

function sumAmounts(rows: any[]): number {
  let s = 0;
  for (const r of rows ?? []) s += pickAmount(r);
  return s;
}

export async function GET(req: Request) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    if (!url || !anon) {
      return NextResponse.json({ error: "Missing Supabase env" }, { status: 500 });
    }

    // 1) Bearer token（沒有就 401；直接開 API 會看到這個是正常的）
    const auth = req.headers.get("authorization") || "";
    const m = auth.match(/^Bearer\s+(.+)$/i);
    const token = m?.[1];
    if (!token) {
      return NextResponse.json({ error: "Missing Authorization Bearer token" }, { status: 401 });
    }

    // 2) anon client + user JWT -> 讓後續查詢帶 JWT（RLS 生效）
    const supabase = createClient(url, anon, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }
    const user_id = userData.user.id;

    // 3) Freeze 狀態
    const { data: poolState, error: poolErr } = await supabase
      .from("pool_state")
      .select('id,"freeze",updated_at')
      .eq("id", 1)
      .maybeSingle();

    if (poolErr) {
      return NextResponse.json({ error: `pool_state query failed: ${poolErr.message}` }, { status: 500 });
    }

    const frozen = Boolean(poolState?.freeze);

    // 4) 規則 4/5：
    // - principal：只算 SETTLED 入金/出金
    // - pending_withdraw：只算 PENDING 提款
    // ✅ 這裡改成 select("*")，完全避開欄位不存在問題
    const { data: myDeposits, error: depErr } = await supabase
      .from("investor_deposit_requests")
      .select("*")
      .eq("user_id", user_id)
      .eq("status", "SETTLED");

    if (depErr) {
      return NextResponse.json({ error: `deposit query failed: ${depErr.message}` }, { status: 500 });
    }

    const { data: myWithdrawSettled, error: wdSetErr } = await supabase
      .from("investor_withdraw_requests")
      .select("*")
      .eq("user_id", user_id)
      .eq("status", "SETTLED");

    if (wdSetErr) {
      return NextResponse.json({ error: `withdraw settled query failed: ${wdSetErr.message}` }, { status: 500 });
    }

    const { data: myWithdrawPending, error: wdPenErr } = await supabase
      .from("investor_withdraw_requests")
      .select("*")
      .eq("user_id", user_id)
      .eq("status", "PENDING");

    if (wdPenErr) {
      return NextResponse.json({ error: `withdraw pending query failed: ${wdPenErr.message}` }, { status: 500 });
    }

    const deposits_sum = sumAmounts(myDeposits || []);
    const withdraw_settled_sum = sumAmounts(myWithdrawSettled || []);
    const pending_withdraw_sum = sumAmounts(myWithdrawPending || []);

    const principal_usd = deposits_sum - withdraw_settled_sum;

    // 5) NAV：用本站 origin 打 pool-metrics
    let nav_usd: number | null = null;
    try {
      const base = new URL(req.url).origin;
      const r = await fetch(`${base}/api/public/pool-metrics`, { cache: "no-store" });
      const j = await r.json();
      const n = Number(j?.nav_usd);
      nav_usd = Number.isFinite(n) ? n : null;
    } catch {
      nav_usd = null;
    }

    // 6) 全體 principal / profit_pool / investor_pnl（Freeze=false 才算）
    let total_principal_usd: number | null = null;
    let profit_pool_usd: number | null = null;
    let investor_pnl_usd: number | null = null;

    if (!frozen && nav_usd != null) {
      try {
        // ⚠️ 這段很可能被 RLS 擋（投資人 JWT 通常不能全表查）
        // 所以失敗就回 null，不阻塞個人 principal/pending
        const { data: allDeposits, error: aDepErr } = await supabase
          .from("investor_deposit_requests")
          .select("*")
          .eq("status", "SETTLED");
        if (aDepErr) throw aDepErr;

        const { data: allWithdraws, error: aWdErr } = await supabase
          .from("investor_withdraw_requests")
          .select("*")
          .eq("status", "SETTLED");
        if (aWdErr) throw aWdErr;

        const aDep = sumAmounts(allDeposits || []);
        const aWd = sumAmounts(allWithdraws || []);

        total_principal_usd = aDep - aWd;
        profit_pool_usd = nav_usd - total_principal_usd;

        investor_pnl_usd = total_principal_usd > 0 ? profit_pool_usd * (principal_usd / total_principal_usd) : 0;
      } catch {
        total_principal_usd = null;
        profit_pool_usd = null;
        investor_pnl_usd = null;
      }
    }

    return NextResponse.json({
      user_id,
      frozen,
      nav_usd,
      principal_usd,
      pending_withdraw_usd: pending_withdraw_sum,
      total_principal_usd,
      profit_pool_usd,
      investor_pnl_usd,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
