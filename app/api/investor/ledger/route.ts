// app/api/investor/ledger/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Row = {
  amount_usd?: number | null;
  amount_u?: number | null;
  amount?: number | null;
  status?: string | null;
};

function pickAmount(r: Row): number {
  const v = r.amount_usd ?? r.amount_u ?? r.amount ?? 0;
  return typeof v === "number" ? v : Number(v || 0);
}

function sumAmounts(rows: Row[]): number {
  let s = 0;
  for (const r of rows) s += pickAmount(r);
  return s;
}

export async function GET(req: Request) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    if (!url || !anon) {
      return NextResponse.json({ error: "Missing Supabase env" }, { status: 500 });
    }

    // 1) 讀 token
    const auth = req.headers.get("authorization") || "";
    const m = auth.match(/^Bearer\s+(.+)$/i);
    const token = m?.[1];
    if (!token) {
      return NextResponse.json({ error: "Missing Authorization Bearer token" }, { status: 401 });
    }

    // 2) 用 anon client + token 驗證 user（同時讓後續查詢帶著 user JWT → RLS 生效）
    const supabase = createClient(url, anon, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }
    const user_id = userData.user.id;

    // 3) Freeze 狀態（pool_state）
    const { data: poolState } = await supabase
      .from("pool_state")
      .select('id,"freeze",updated_at')
      .eq("id", 1)
      .maybeSingle();

    const frozen = Boolean(poolState?.freeze);

    // 4) 你的規則 4/5：只算 SETTLED；Pending 只看 PENDING 提款
    //    這裡表名用 investor_deposit_requests / investor_withdraw_requests
    //    欄位用 amount_usd 或 amount_u 或 amount
    const { data: myDeposits, error: depErr } = await supabase
      .from("investor_deposit_requests")
      .select("amount_usd,amount_u,amount,status")
      .eq("user_id", user_id)
      .eq("status", "SETTLED");

    if (depErr) {
      return NextResponse.json({ error: `deposit query failed: ${depErr.message}` }, { status: 500 });
    }

    const { data: myWithdrawSettled, error: wdSetErr } = await supabase
      .from("investor_withdraw_requests")
      .select("amount_usd,amount_u,amount,status")
      .eq("user_id", user_id)
      .eq("status", "SETTLED");

    if (wdSetErr) {
      return NextResponse.json({ error: `withdraw settled query failed: ${wdSetErr.message}` }, { status: 500 });
    }

    const { data: myWithdrawPending, error: wdPenErr } = await supabase
      .from("investor_withdraw_requests")
      .select("amount_usd,amount_u,amount,status")
      .eq("user_id", user_id)
      .eq("status", "PENDING");

    if (wdPenErr) {
      return NextResponse.json({ error: `withdraw pending query failed: ${wdPenErr.message}` }, { status: 500 });
    }

    const deposits_sum = sumAmounts(myDeposits || []);
    const withdraw_settled_sum = sumAmounts(myWithdrawSettled || []);
    const pending_withdraw_sum = sumAmounts(myWithdrawPending || []);

    const principal_usd = deposits_sum - withdraw_settled_sum;

    // 5) profit_pool / investor_pnl（規則 7/8/9）
    // 這裡先嘗試從 public pool-metrics 拿 NAV（避免你再多寫一套 NAV query）
    // 如果你想改成直接查 nav_snapshots 也可以。
    let nav_usd: number | null = null;
    try {
      const origin = req.headers.get("origin") || "";
      const base = origin || ""; // 沒有 origin 就不強求
      if (base) {
        const r = await fetch(`${base}/api/public/pool-metrics`, { cache: "no-store" });
        const j = await r.json();
        const n = Number(j?.nav_usd);
        nav_usd = Number.isFinite(n) ? n : null;
      }
    } catch {}

    // 全體 principal：用 anon + RLS 可能會被擋（看你 policy）
    // 被擋我就回 null（不影響你先把 principal/pending 做起來）
    let total_principal_usd: number | null = null;
    let profit_pool_usd: number | null = null;
    let investor_pnl_usd: number | null = null;

    if (!frozen && nav_usd != null) {
      try {
        const { data: allDeposits, error: aDepErr } = await supabase
          .from("investor_deposit_requests")
          .select("amount_usd,amount_u,amount,status")
          .eq("status", "SETTLED");

        if (aDepErr) throw aDepErr;

        const { data: allWithdraws, error: aWdErr } = await supabase
          .from("investor_withdraw_requests")
          .select("amount_usd,amount_u,amount,status")
          .eq("status", "SETTLED");

        if (aWdErr) throw aWdErr;

        const aDep = sumAmounts(allDeposits || []);
        const aWd = sumAmounts(allWithdraws || []);
        total_principal_usd = aDep - aWd;

        profit_pool_usd = nav_usd - total_principal_usd;

        if (total_principal_usd > 0) {
          investor_pnl_usd = profit_pool_usd * (principal_usd / total_principal_usd);
        } else {
          investor_pnl_usd = 0;
        }
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
