"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Legend,
  Cell,
  CartesianGrid,
} from "recharts";

import { Shell, Card, Metric, THEME, PIE_PALETTE } from "@/components/mf/MfUi";

/* =======================
   Types (match your APIs)
======================= */
type PoolMetrics = {
  nav_usd: number | string;
  nav_ts: string | null;
  wtd_usd: number | string;
  total_principal_usd: number | string;
  freeze: boolean;
  snapshot_id?: number | null;
};

type NavHistoryRow = { timestamp: string; total_nav: number | string };
type AllocationRow = { category: string; label: string; value_usdt: number | string };
type PositionRow = {
  category: string;
  source: string;
  asset: string;
  amount: number | string | null;
  value_usdt: number | string | null;
  chain: string;
};

type CategoryPnlRow = {
  category: "CEX" | "DeFi" | "Staking" | string;
  value_usd: number | string;
  pnl_now: number | string;
  pnl_24h: number | string;
  pnl_wtd: number | string;
};

type CategoryPnlResp = {
  latest_ts: string | null;
  snapshot_ids?: { latest: number; prev: number | null; day: number | null; week: number | null };
  rows: CategoryPnlRow[];
};

/* =======================
   Utils
======================= */
function num(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function fmtUsd(v: any) {
  const n = num(v);
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
function fmtUsdCompact(v: any) {
  const n = num(v);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 10_000) return `${(n / 10_000).toFixed(2)}萬`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(2)}K`;
  return n.toFixed(0);
}
function formatTime(ts: string | null) {
  if (!ts) return "—";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toLocaleString();
}
function shortDate(ts: string) {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${mm}/${dd} ${hh}:${mi}`;
}
async function safeReadJson(r: Response) {
  const text = await r.text();
  if (!text) return { ok: r.ok, status: r.status, data: null as any, raw: "" };
  try {
    const data = JSON.parse(text);
    return { ok: r.ok, status: r.status, data, raw: text };
  } catch {
    return { ok: r.ok, status: r.status, data: null as any, raw: text };
  }
}

function fmtSigned(v: any) {
  const n = num(v);
  const sign = n >= 0 ? "+" : "";
  return `${sign}${fmtUsd(n)}`;
}

/* =======================
   UI helpers
======================= */
function LineTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const v = payload?.[0]?.value;
  return (
    <div
      className="rounded-xl border px-3 py-2 text-xs shadow-[0_12px_44px_rgba(0,0,0,0.70)] backdrop-blur"
      style={{
        borderColor: "rgba(226,198,128,0.18)",
        background: "rgba(5,7,10,0.82)",
        color: THEME.text,
      }}
    >
      <div style={{ color: THEME.muted }}>{formatTime(label)}</div>
      <div className="mt-1 font-semibold" style={{ color: THEME.gold2 }}>
        ${fmtUsd(v)}
      </div>
    </div>
  );
}

function DoughnutCenter({ totalNavUsd }: { totalNavUsd: number }) {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div className="text-center">
        <div className="text-[11px]" style={{ color: THEME.muted }}>
          總資產（NAV）
        </div>
        <div className="mt-1 text-lg font-semibold" style={{ color: THEME.gold2 }}>
          {fmtUsdCompact(totalNavUsd)} 美元
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [pool, setPool] = useState<PoolMetrics | null>(null);
  const [navHistory, setNavHistory] = useState<NavHistoryRow[]>([]);
  const [allocation, setAllocation] = useState<AllocationRow[]>([]);
  const [positions, setPositions] = useState<PositionRow[]>([]);
  const [catPnl, setCatPnl] = useState<CategoryPnlResp | null>(null);

  const [range, setRange] = useState<"7D" | "30D" | "ALL">("7D");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [chainFilter, setChainFilter] = useState<string>("all");

  async function reloadAll() {
    try {
      setErr(null);
      setLoading(true);

      const [rPool, rNav, rAlloc, rPos, rCat] = await Promise.all([
        fetch("/api/public/pool-metrics", { cache: "no-store" }),
        fetch("/api/public/nav-history", { cache: "no-store" }),
        fetch("/api/public/allocation", { cache: "no-store" }),
        fetch("/api/public/positions", { cache: "no-store" }),
        fetch("/api/public/category-pnl", { cache: "no-store" }),
      ]);

      const oPool = await safeReadJson(rPool);
      const oNav = await safeReadJson(rNav);
      const oAlloc = await safeReadJson(rAlloc);
      const oPos = await safeReadJson(rPos);
      const oCat = await safeReadJson(rCat);

      if (!oPool.ok) throw new Error(oPool.data?.error || `pool-metrics HTTP ${oPool.status}`);
      if (!oNav.ok) throw new Error(oNav.data?.error || `nav-history HTTP ${oNav.status}`);
      if (!oAlloc.ok) throw new Error(oAlloc.data?.error || `allocation HTTP ${oAlloc.status}`);
      if (!oPos.ok) throw new Error(oPos.data?.error || `positions HTTP ${oPos.status}`);
      if (!oCat.ok) throw new Error(oCat.data?.error || `category-pnl HTTP ${oCat.status}`);

      setPool(oPool.data as PoolMetrics);
      setNavHistory((oNav.data?.rows ?? []) as NavHistoryRow[]);
      setAllocation((oAlloc.data?.rows ?? []) as AllocationRow[]);
      setPositions((oPos.data?.rows ?? []) as PositionRow[]);
      setCatPnl((oCat.data ?? null) as CategoryPnlResp);
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reloadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const navUsd = num(pool?.nav_usd ?? 0);
  const navTs = pool?.nav_ts ?? null;
  const wtdUsd = num(pool?.wtd_usd ?? 0);
  const principalUsd = num(pool?.total_principal_usd ?? 0);
  const freeze = Boolean(pool?.freeze);
  const snapshotId = pool?.snapshot_id ?? null;

  const weekPnlPositive = wtdUsd >= 0;

  const navChartData = useMemo(() => {
    const rows = [...(navHistory ?? [])].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    if (rows.length === 0) return [];
    if (range === "ALL") return rows;

    const days = range === "7D" ? 7 : 30;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return rows.filter((r) => new Date(r.timestamp).getTime() >= cutoff);
  }, [navHistory, range]);

  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    for (const p of positions ?? []) set.add(p.category);
    return ["all", ...Array.from(set)];
  }, [positions]);

  const chainOptions = useMemo(() => {
    const set = new Set<string>();
    for (const p of positions ?? []) set.add(p.chain);
    return ["all", ...Array.from(set)];
  }, [positions]);

  const filteredPositions = useMemo(() => {
    const rows = positions ?? [];
    const q = search.trim().toLowerCase();

    return rows.filter((p) => {
      if (categoryFilter !== "all" && p.category !== categoryFilter) return false;
      if (chainFilter !== "all" && p.chain !== chainFilter) return false;
      if (!q) return true;
      const hay = `${p.asset} ${p.chain} ${p.category} ${p.source}`.toLowerCase();
      return hay.includes(q);
    });
  }, [positions, search, categoryFilter, chainFilter]);

  // ==========================
  // ✅ Allocation: SCALE-TO-NAV
  // ==========================
  const allocRaw = useMemo(() => {
    return (allocation ?? [])
      .map((r) => ({ ...r, value_usdt: num(r.value_usdt) }))
      .filter((r) => num(r.value_usdt) > 0);
  }, [allocation]);

  const allocRawTotal = useMemo(
    () => allocRaw.reduce((acc, r) => acc + num(r.value_usdt), 0),
    [allocRaw]
  );

  const allocScale = useMemo(() => {
    if (navUsd <= 0) return 1;
    if (allocRawTotal <= 0) return 1;
    return navUsd / allocRawTotal;
  }, [navUsd, allocRawTotal]);

  // pie 使用「縮放後」的 value_usdt，確保 pie 總和 = NAV
  const allocRows = useMemo(() => {
    return allocRaw.map((r) => ({
      ...r,
      value_usdt: num(r.value_usdt) * allocScale,
    }));
  }, [allocRaw, allocScale]);

  // mismatch hint：比較 RAW sum vs NAV（畫圖仍用 NAV 對齊）
  const allocDiffPct = useMemo(() => {
    if (navUsd <= 0) return 0;
    if (allocRawTotal <= 0) return 0;
    return Math.abs(allocRawTotal - navUsd) / navUsd;
  }, [allocRawTotal, navUsd]);

  // ==========================
  // ✅ Category PnL (raw)
  // ==========================
  const pnlRows = useMemo(() => {
    const rows = (catPnl?.rows ?? []) as CategoryPnlRow[];
    const wanted = ["CEX", "DeFi", "Staking"];
    const by = new Map<string, CategoryPnlRow>();
    for (const r of rows) by.set(String(r.category), r);

    return wanted.map((c) => {
      const r = by.get(c) ?? { category: c, value_usd: 0, pnl_now: 0, pnl_24h: 0, pnl_wtd: 0 };
      return {
        category: c,
        value_usd: num(r.value_usd),
        pnl_now: num(r.pnl_now),
        pnl_24h: num(r.pnl_24h),
        pnl_wtd: num(r.pnl_wtd),
      };
    });
  }, [catPnl]);

  if (loading) {
    return (
      <div className="min-h-screen p-10" style={{ background: THEME.bg, color: THEME.muted }}>
        <div className="text-sm">Loading…</div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="min-h-screen p-10" style={{ background: THEME.bg, color: THEME.muted }}>
        <div className="font-semibold" style={{ color: THEME.bad }}>
          Error
        </div>
        <div className="mt-2 text-sm whitespace-pre-line" style={{ color: THEME.muted }}>
          {err}
        </div>
      </div>
    );
  }

  return (
    <Shell>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-1">
            <Image src="/logo.png" alt="MoneyFlow" width={120} height={120} className="rounded-xl" />
          </div>

          <div>
            {/* ✅ 只留一份 MoneyFlow（刪除多餘那份 Fund Core Dashboard 那行） */}
            <h1 className="text-3xl font-semibold tracking-tight">MoneyFlow</h1>

            <div className="mt-2 text-sm" style={{ color: THEME.muted }}>
              最後更新：{" "}
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

            <div className="mt-1 text-xs" style={{ color: THEME.muted }}>
              Snapshot ID：{snapshotId ?? "—"}
            </div>
          </div>
        </div>

        {/* ✅ 右上角按鈕區塊：Investor Login 直接去 /investors/login */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/investors/login"
            className="rounded-full border px-3 py-1 text-xs font-semibold transition"
            style={{
              borderColor: "rgba(255,255,255,0.25)",
              color: "rgba(255,255,255,0.95)",
              background: "rgba(255,255,255,0.10)",
            }}
          >
            Investor Login
          </Link>

          <Link
            href="/admin"
            className="rounded-full border px-3 py-1 text-xs font-semibold transition"
            style={{
              borderColor: "rgba(226,198,128,0.18)",
              color: THEME.gold2,
              background: "rgba(212,175,55,0.10)",
            }}
            title="管理後台（需要登入）"
          >
            Admin
          </Link>

          <button
            onClick={reloadAll}
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

      {/* KPI */}
      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card accent="gold">
          <Metric label="總淨值（NAV）" value={`${fmtUsd(navUsd)} 美元`} sub="USD（只讀）" />
        </Card>

        <Card accent={weekPnlPositive ? "good" : "bad"}>
          <Metric
            label="本週損益（WTD）"
            value={`${weekPnlPositive ? "+" : ""}${fmtUsd(wtdUsd)} 美元`}
            sub="WTD（週日歸零）"
            tone={weekPnlPositive ? "good" : "bad"}
          />
        </Card>

        <Card accent="navy">
          <Metric label="淨入金（Principal）" value={`${fmtUsd(principalUsd)} 美元`} sub="入金累積 − 出金累積" />
        </Card>
      </div>

      {/* Charts row 1 */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* NAV history */}
        <Card
          className="lg:col-span-2"
          accent="gold"
          title="淨值歷史"
          subtitle="基於 nav_snapshots"
          right={
            <div className="flex items-center gap-2">
              {(["7D", "30D", "ALL"] as const).map((k) => {
                const active = range === k;
                return (
                  <button
                    key={k}
                    onClick={() => setRange(k)}
                    className="rounded-full border px-3 py-1 text-xs font-semibold transition-colors"
                    style={{
                      borderColor: active ? "rgba(226,198,128,0.42)" : "rgba(148,163,184,0.16)",
                      background: active ? "rgba(212,175,55,0.14)" : "rgba(255,255,255,0.03)",
                      color: active ? THEME.gold2 : THEME.muted,
                      boxShadow: active ? "0 0 18px rgba(212,175,55,0.14)" : undefined,
                    }}
                  >
                    {k === "ALL" ? "全部" : k}
                  </button>
                );
              })}
            </div>
          }
        >
          <div className="h-72">
            {navChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm" style={{ color: THEME.muted }}>
                尚無 NAV 歷史資料（請先插入 nav_snapshots 或接上 snapshot-runner）
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={navChartData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="4 4" stroke="rgba(148,163,184,0.16)" />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={(v) => shortDate(v)}
                    minTickGap={28}
                    tick={{ fontSize: 12, fill: "rgba(255,255,255,0.55)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(v) => `${Math.round(v)}`}
                    width={52}
                    tick={{ fontSize: 12, fill: "rgba(255,255,255,0.55)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<LineTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="total_nav"
                    stroke={THEME.gold2}
                    strokeWidth={2.9}
                    dot={false}
                    activeDot={{ r: 4, fill: THEME.gold2, stroke: "rgba(255,255,255,0.35)" }}
                    style={{ filter: "drop-shadow(0 0 12px rgba(212,175,55,0.28))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* ✅ Allocation + PnL list */}
        <Card accent="navy" title="分配（Allocation）" subtitle="圓餅總和永遠對齊 NAV；損益用快照差分（raw）">
          <div className="relative h-72">
            {allocRows.length === 0 || navUsd <= 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <div className="text-sm font-semibold" style={{ color: THEME.text }}>
                  Allocation 目前是空的
                </div>
                <div className="mt-2 text-xs" style={{ color: THEME.muted }}>
                  （等 position_snapshots 有資料就會出現分布圖）
                </div>
                <div
                  className="mt-3 rounded-full border px-3 py-1 text-xs"
                  style={{
                    borderColor: "rgba(226,198,128,0.18)",
                    background: "rgba(255,255,255,0.03)",
                    color: THEME.gold2,
                  }}
                >
                  NAV：{fmtUsd(navUsd)} 美元
                </div>
              </div>
            ) : (
              <>
                <DoughnutCenter totalNavUsd={navUsd} />
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={allocRows}
                      dataKey="value_usdt"
                      nameKey="label"
                      innerRadius="58%"
                      outerRadius="86%"
                      paddingAngle={2}
                      stroke="rgba(255,255,255,0.14)"
                    >
                      {allocRows.map((_, idx) => (
                        <Cell key={idx} fill={PIE_PALETTE[idx % PIE_PALETTE.length]} />
                      ))}
                    </Pie>

                    <Tooltip
                      formatter={(v: any) => `$${fmtUsd(v)}`}
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid rgba(226,198,128,0.18)",
                        background: "rgba(5,7,10,0.82)",
                        color: THEME.text,
                      }}
                    />
                    <Legend wrapperStyle={{ color: "rgba(255,255,255,0.72)" }} />
                  </PieChart>
                </ResponsiveContainer>
              </>
            )}
          </div>

          {/* mismatch hint：raw vs NAV */}
          {allocRows.length > 0 && allocDiffPct > 0.02 ? (
            <div className="mt-3 text-xs" style={{ color: THEME.muted }}>
              提醒：raw Allocation 加總（${fmtUsd(allocRawTotal)}）與 NAV（${fmtUsd(navUsd)}）不一致；
              圓餅已自動縮放對齊 NAV（scale = {allocScale.toFixed(4)}）。
            </div>
          ) : null}

          {/* ✅ CEX/DeFi/Staking PnL */}
          <div
            className="mt-4 rounded-2xl border p-3"
            style={{ borderColor: "rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.02)" }}
          >
            <div className="text-xs font-semibold mb-2" style={{ color: THEME.text }}>
              三類損益（CEX / DeFi / Staking）
              <span className="ml-2 font-normal" style={{ color: THEME.muted }}>
                pnl_now=相對上一筆｜24h=相對24小時前｜WTD=週日00:00起算
              </span>
            </div>

            <div className="space-y-2">
              {pnlRows.map((r) => {
                const tone24 = r.pnl_24h >= 0 ? THEME.good : THEME.bad;
                const toneW = r.pnl_wtd >= 0 ? THEME.good : THEME.bad;
                const toneNow = r.pnl_now >= 0 ? THEME.good : THEME.bad;

                return (
                  <div key={r.category} className="flex items-center justify-between text-sm">
                    <div className="flex flex-col">
                      <div className="font-semibold" style={{ color: THEME.text }}>
                        {r.category}
                        <span className="ml-2 text-xs" style={{ color: THEME.muted }}>
                          ${fmtUsd(r.value_usd)}
                        </span>
                      </div>
                      <div className="text-xs" style={{ color: THEME.muted }}>
                        pnl_now{" "}
                        <span style={{ color: toneNow, fontWeight: 700 }}>{fmtSigned(r.pnl_now)}</span>{" "}
                        ｜ 24h{" "}
                        <span style={{ color: tone24, fontWeight: 700 }}>{fmtSigned(r.pnl_24h)}</span>{" "}
                        ｜ WTD{" "}
                        <span style={{ color: toneW, fontWeight: 700 }}>{fmtSigned(r.pnl_wtd)}</span>
                      </div>
                    </div>

                    <div
                      className="rounded-full border px-2 py-0.5 text-xs"
                      style={{
                        borderColor: "rgba(226,198,128,0.18)",
                        background: "rgba(255,255,255,0.03)",
                        color: THEME.gold2,
                      }}
                      title="這是 category 的 raw 市值（未縮放），損益也以 raw 差分計算"
                    >
                      raw
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-2 text-[11px]" style={{ color: THEME.muted }}>
              * 圓餅圖用 scale-to-NAV 做視覺對齊；損益用 raw positions 的歷史快照差分，確保口徑一致。
            </div>
          </div>
        </Card>
      </div>

      {/* Positions */}
      <Card
        className="mt-6"
        accent="gold"
        title="持倉明細"
        subtitle={`${filteredPositions.length} 行`}
        right={
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜尋 資產 / 鏈 / 類別"
              className="w-full sm:w-80 rounded-xl border px-3 py-2 text-sm outline-none"
              style={{
                borderColor: "rgba(226,198,128,0.18)",
                background: "rgba(255,255,255,0.03)",
                color: THEME.text,
              }}
            />

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-xl border px-3 py-2 text-sm"
              style={{
                borderColor: "rgba(226,198,128,0.18)",
                background: "rgba(255,255,255,0.03)",
                color: THEME.text,
              }}
            >
              {categoryOptions.map((c) => (
                <option key={c} value={c} className="bg-[#07090D]">
                  {c === "all" ? "所有類別" : c}
                </option>
              ))}
            </select>

            <select
              value={chainFilter}
              onChange={(e) => setChainFilter(e.target.value)}
              className="rounded-xl border px-3 py-2 text-sm"
              style={{
                borderColor: "rgba(226,198,128,0.18)",
                background: "rgba(255,255,255,0.03)",
                color: THEME.text,
              }}
            >
              {chainOptions.map((c) => (
                <option key={c} value={c} className="bg-[#07090D]">
                  {c === "all" ? "所有鏈" : c}
                </option>
              ))}
            </select>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b text-left" style={{ borderColor: "rgba(226,198,128,0.18)", color: THEME.muted }}>
                <th className="py-3 pr-4">資產</th>
                <th className="py-3 pr-4 text-right">金額</th>
                <th className="py-3 pr-4 text-right">價值（USD）</th>
                <th className="py-3">鏈</th>
              </tr>
            </thead>
            <tbody>
              {filteredPositions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-sm" style={{ color: THEME.muted }}>
                    尚無 positions 資料（你可以先用測試資料，或接 snapshot-runner）
                  </td>
                </tr>
              ) : (
                filteredPositions.map((p, idx) => (
                  <tr
                    key={idx}
                    className="border-b transition-colors"
                    style={{ borderColor: "rgba(255,255,255,0.06)" }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLTableRowElement).style.background = "rgba(212,175,55,0.06)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLTableRowElement).style.background = "transparent";
                    }}
                  >
                    <td className="py-3 pr-4" style={{ color: THEME.gold2, fontWeight: 700 }}>
                      {p.asset}
                    </td>
                    <td className="py-3 pr-4 text-right" style={{ color: THEME.muted }}>
                      {p.amount == null ? "—" : String(p.amount)}
                    </td>
                    <td className="py-3 pr-4 text-right font-semibold" style={{ color: THEME.text }}>
                      ${fmtUsd(p.value_usdt)}
                    </td>
                    <td className="py-3" style={{ color: THEME.muted }}>
                      {p.chain}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </Shell>
  );
}
