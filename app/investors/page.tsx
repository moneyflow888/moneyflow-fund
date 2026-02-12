// FORCE REDEPLOY 1

"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Shell, Card, Metric, THEME, Button } from "@/components/mf/MfUi";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

type PoolMetrics = {
  nav_usd: number | string;
  nav_ts: string | null;
  wtd_usd: number | string;
  total_principal_usd: number | string;
  freeze: boolean;
  snapshot_id?: number | null;
};

type Ledger = {
  user_id: string;
  frozen: boolean;
  nav_usd: number | null;
  principal_usd: number;
  pending_withdraw_usd: number;
  total_principal_usd: number | null;
  profit_pool_usd: number | null;
  investor_pnl_usd: number | null;
};

function num(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function fmtUsd(v: any) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
function formatTime(ts: string | null) {
  if (!ts) return "—";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toLocaleString();
}
async function safeReadJson(r: Response) {
  const text = await r.text();
  if (!text) return { ok: r.ok, status: r.status, data: null as any };
  try {
    return { ok: r.ok, status: r.status, data: JSON.parse(text) };
  } catch {
    return { ok: r.ok, status: r.status, data: null as any };
  }
}

export default function InvestorsPage() {
  const router = useRouter();
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [pool, setPool] = useState<PoolMetrics | null>(null);

  const [authedEmail, setAuthedEmail] = useState<string | null>(null);

  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerErr, setLedgerErr] = useState<string | null>(null);
  const [ledger, setLedger] = useState<Ledger | null>(null);

  // auth state
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setAuthedEmail(data.session?.user?.email ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthedEmail(session?.user?.email ?? null);
    });

    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  async function reloadPool() {
    try {
      setErr(null);
      setLoading(true);

      const r = await fetch("/api/public/pool-metrics", { cache: "no-store" });
      const o = await safeReadJson(r);
      if (!o.ok) throw new Error(o.data?.error || `pool-metrics HTTP ${o.status}`);

      setPool(o.data as PoolMetrics);
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function reloadLedger() {
    setLedgerErr(null);
    setLedgerLoading(true);
    try {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!session) {
        setLedger(null);
        return;
      }

      const r = await fetch("/api/investor/ledger", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        cache: "no-store",
      });

      const o = await safeReadJson(r);
      if (!o.ok) throw new Error(o.data?.error || `ledger HTTP ${o.status}`);

      setLedger(o.data as Ledger);
    } catch (e: any) {
      setLedgerErr(e?.message || String(e));
      setLedger(null);
    } finally {
      setLedgerLoading(false);
    }
  }

  useEffect(() => {
    reloadPool();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (authedEmail) reloadLedger();
    else {
      setLedger(null);
      setLedgerErr(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authedEmail]);

  const navUsd = num(pool?.nav_usd ?? 0);
  const wtdUsd = num(pool?.wtd_usd ?? 0);
  const principalUsd = num(pool?.total_principal_usd ?? 0);
  const freeze = Boolean(pool?.freeze);
  const navTs = pool?.nav_ts ?? null;

  const weekPnlPositive = wtdUsd >= 0;

  async function logout() {
    await supabase.auth.signOut();
    router.push("/investors/login");
  }

  if (loading) {
    return (
      <div className="min-h-screen p-10" style={{ background: THEME.bg, color: THEME.muted }}>
        Loading…
      </div>
    );
  }

  if (err) {
    return (
      <div className="min-h-screen p-10" style={{ background: THEME.bg, color: THEME.muted }}>
        <div className="font-semibold" style={{ color: THEME.bad }}>
          Error
        </div>
        <div className="mt-2 text-sm whitespace-pre-line">{err}</div>
        <button
          onClick={reloadPool}
          className="mt-4 rounded-full border px-3 py-1 text-xs font-semibold"
          style={{
            borderColor: "rgba(226,198,128,0.18)",
            color: THEME.gold2,
            background: "rgba(212,175,55,0.10)",
          }}
        >
          重新載入
        </button>
      </div>
    );
  }

  return (
    <>
      {/* ✅ DEPLOY TEST（確認你部署有吃到這個檔案） */}
      <div style={{ position: "fixed", top: 10, left: 10, zIndex: 9999, color: "#fff" }}>
        DEPLOY TEST A
      </div>

      <Shell>
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-1">
              <Image src="/logo.png" alt="MoneyFlow" width={88} height={88} className="rounded-xl" />
            </div>

            <div>
              <h1 className="text-3xl font-semibold tracking-tight">
                MoneyFlow
                <span className="ml-3 align-middle text-xs font-semibold" style={{ color: THEME.muted }}>
                  Investor Portal
                </span>
              </h1>

              <div className="mt-2 text-sm" style={{ color: THEME.muted }}>
                基金最後更新：{" "}
                <span className="font-medium" style={{ color: THEME.text }}>
                  {formatTime(navTs)}
                </span>
                <span
                  className="ml-3 rounded-full border px-2 py-0.5 text-xs font-semibold"
                  style={{
                    borderColor: freeze ? "rgba(226,198,128,0.35)" : "rgba(34,197,94,0.30)",
                    color: freeze ? THEME.gold2 : THEME.good,
                    background: freeze ? "rgba(212,175,55,0.10)" : "rgba(34,197,94,0.10)",
                  }}
                >
                  FREEZE = {freeze ? "ON" : "OFF"}
                </span>
              </div>

              <div className="mt-2 text-xs" style={{ color: THEME.muted }}>
                * 投資人損益會在 Freeze=true 時凍結（不更新）
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/"
              className="rounded-full border px-3 py-1 text-xs font-semibold transition"
              style={{
                borderColor: "rgba(255,255,255,0.20)",
                color: "rgba(255,255,255,0.92)",
                background: "rgba(255,255,255,0.08)",
              }}
            >
              回公開首頁
            </Link>

            {authedEmail ? (
              <>
                <div
                  className="rounded-full border px-3 py-1 text-xs font-semibold"
                  style={{
                    borderColor: "rgba(255,255,255,0.18)",
                    background: "rgba(255,255,255,0.06)",
                    color: "rgba(255,255,255,0.9)",
                  }}
                  title="已登入"
                >
                  {authedEmail}
                </div>

                <Button onClick={logout}>登出</Button>
              </>
            ) : (
              <Link href="/investors/login">
                <Button>投資人登入</Button>
              </Link>
            )}

            <button
              onClick={() => {
                reloadPool();
                if (authedEmail) reloadLedger();
              }}
              className="rounded-full border px-3 py-1 text-xs font-semibold transition"
              style={{
                borderColor: "rgba(226,198,128,0.18)",
                color: THEME.gold2,
                background: "rgba(212,175,55,0.10)",
              }}
            >
              重新載入
            </button>
          </div>
        </div>

        {/* Fund KPI */}
        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card accent="gold">
            <Metric label="基金總淨值（NAV）" value={`${fmtUsd(navUsd)} 美元`} sub="USD（只讀）" />
          </Card>

          <Card accent={weekPnlPositive ? "good" : "bad"}>
            <Metric
              label="基金本週損益（WTD）"
              value={`${weekPnlPositive ? "+" : ""}${fmtUsd(wtdUsd)} 美元`}
              sub="WTD（週日歸零）"
              tone={weekPnlPositive ? "good" : "bad"}
            />
          </Card>

          <Card accent="navy">
            <Metric label="全體淨入金（Principal）" value={`${fmtUsd(principalUsd)} 美元`} sub="入金累積 − 出金累積" />
          </Card>
        </div>

        {/* Investor Ledger */}
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card
            accent="gold"
            title="我的帳本"
            subtitle={authedEmail ? "已登入：顯示我的 Principal / Pending / PnL" : "請先登入以查看自己的帳本"}
          >
            {!authedEmail ? (
              <div className="text-sm" style={{ color: THEME.muted }}>
                你目前尚未登入。
                <div className="mt-3">
                  <Link href="/investors/login">
                    <Button>前往登入 / 註冊</Button>
                  </Link>
                </div>
              </div>
            ) : (
              <>
                {ledgerErr ? (
                  <div className="text-sm whitespace-pre-line" style={{ color: THEME.bad }}>
                    {ledgerErr}
                    <div className="mt-3">
                      <Button onClick={reloadLedger}>再試一次</Button>
                    </div>
                  </div>
                ) : null}

                <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-3">
                  <Card accent="navy">
                    <Metric
                      label="我的淨入金"
                      value={`${fmtUsd(ledger?.principal_usd ?? null)} 美元`}
                      sub="SETTLED 入 − SETTLED 出"
                    />
                  </Card>

                  {/* ✅ 修正：blue → navy */}
                  <Card accent="navy">
                    <Metric
                      label="我的待提款"
                      value={`${fmtUsd(ledger?.pending_withdraw_usd ?? null)} 美元`}
                      sub="PENDING 提款加總"
                    />
                  </Card>

                  <Card accent="good">
                    <Metric
                      label="我的目前損益"
                      value={ledger?.frozen ? "Frozen" : `${fmtUsd(ledger?.investor_pnl_usd ?? null)} 美元`}
                      sub={ledger?.frozen ? "Freeze=true 不更新" : "比例分配損益"}
                      tone={
                        ledger?.frozen
                          ? "muted"
                          : (ledger?.investor_pnl_usd ?? 0) >= 0
                          ? "good"
                          : "bad"
                      }
                    />
                  </Card>
                </div>

                <div className="mt-3 text-xs" style={{ color: THEME.muted }}>
                  {ledgerLoading
                    ? "載入中…"
                    : "＊若全體淨入金 / profit_pool 顯示 —，代表 RLS 擋住投資人讀全體資料。下一步我會改成用 service role 計算後回傳。"}
                </div>
              </>
            )}
          </Card>

          <Card accent="navy" title="規則提示" subtitle="你確認的規則 7~10（核心）">
            <div className="text-sm leading-6" style={{ color: THEME.muted }}>
              <div>profit_pool = NAV − 全體 principal 加總</div>
              <div className="mt-2">投資人損益 = profit_pool × (個人 principal / 全體 principal)</div>
              <div className="mt-2">Freeze = true 時：損益不更新、可提款上限凍結</div>

              <div className="mt-4 text-xs" style={{ color: THEME.muted }}>
                <div>NAV（from ledger/public）: {fmtUsd(ledger?.nav_usd ?? null)}</div>
                <div>全體淨入金: {fmtUsd(ledger?.total_principal_usd ?? null)}</div>
                <div>profit_pool: {fmtUsd(ledger?.profit_pool_usd ?? null)}</div>
              </div>
            </div>
          </Card>
        </div>
      </Shell>
    </>
  );
}
