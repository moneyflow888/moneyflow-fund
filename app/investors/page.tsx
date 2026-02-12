"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Shell, Card, Metric, THEME, Button } from "@/components/mf/MfUi";

type PoolMetrics = {
  nav_usd: number | string;
  nav_ts: string | null;
  wtd_usd: number | string;
  total_principal_usd: number | string;
  freeze: boolean;
  snapshot_id?: number | null;
};

function num(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function fmtUsd(v: any) {
  return num(v).toLocaleString(undefined, { maximumFractionDigits: 2 });
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
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [pool, setPool] = useState<PoolMetrics | null>(null);

  async function reload() {
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

  useEffect(() => {
    reload();
  }, []);

  const navUsd = num(pool?.nav_usd ?? 0);
  const wtdUsd = num(pool?.wtd_usd ?? 0);
  const principalUsd = num(pool?.total_principal_usd ?? 0);
  const freeze = Boolean(pool?.freeze);
  const navTs = pool?.nav_ts ?? null;

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
          onClick={reload}
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

  const weekPnlPositive = wtdUsd >= 0;

  return (
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

          {/* 先放佔位：之後接 Supabase Auth */}
          <Button onClick={() => alert("下一步：接 Supabase Auth 登入")}>投資人登入</Button>

          <button
            onClick={reload}
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

      {/* Investor ledger placeholder */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card
          accent="gold"
          title="我的帳本（即將上線）"
          subtitle="下一步：接 investor_accounts + requests（只看自己）"
        >
          <div className="text-sm" style={{ color: THEME.muted }}>
            這裡之後會顯示：
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>我的淨入金（Principal）</li>
              <li>我的待提款（Pending）</li>
              <li>我的目前損益（Freeze=true 時 Frozen）</li>
              <li>入金申請（提交 + 列表）</li>
              <li>提款申請（提交 + 列表）</li>
            </ul>
          </div>
        </Card>

        <Card accent="navy" title="規則提示" subtitle="你確認的規則 7~10（核心）">
          <div className="text-sm leading-6" style={{ color: THEME.muted }}>
            <div>
              profit_pool = NAV − 全體 principal 加總
            </div>
            <div className="mt-2">
              投資人損益 = profit_pool × (個人 principal / 全體 principal)
            </div>
            <div className="mt-2">
              Freeze = true 時：損益不更新、可提款上限凍結
            </div>
          </div>
        </Card>
      </div>
    </Shell>
  );
}
