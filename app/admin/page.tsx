"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shell, Card, Metric, THEME, Button } from "@/components/mf/MfUi";

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
function formatTime(ts: string | null) {
  if (!ts) return "—";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toLocaleString();
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

export default function AdminPage() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [loading, setLoading] = useState(true);
  const [freezeBusy, setFreezeBusy] = useState<null | "on" | "off">(null);
  const [toast, setToast] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [pool, setPool] = useState<PoolMetrics | null>(null);

  const navUsd = useMemo(() => num(pool?.nav_usd ?? 0), [pool?.nav_usd]);
  const wtdUsd = useMemo(() => num(pool?.wtd_usd ?? 0), [pool?.wtd_usd]);
  const principalUsd = useMemo(() => num(pool?.total_principal_usd ?? 0), [pool?.total_principal_usd]);
  const freeze = Boolean(pool?.freeze);
  const navTs = pool?.nav_ts ?? null;

  async function checkAdmin() {
    try {
      setErr(null);
      setChecking(true);

      // ✅ 這支用 cookie 驗證 admin（mf_admin=1）
      const r = await fetch("/api/admin/me", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      // 200 = admin; 401/403 = not admin
      if (!r.ok) {
        setIsAdmin(false);
        // 直接導去 login（你可以改成你自己的路徑）
        router.replace("/admin/login");
        return;
      }

      setIsAdmin(true);
    } catch (e: any) {
      setIsAdmin(false);
      router.replace("/admin/login");
    } finally {
      setChecking(false);
    }
  }

  async function loadPool() {
    try {
      setErr(null);
      setLoading(true);

      const rPool = await fetch("/api/public/pool-metrics", { cache: "no-store" });
      const oPool = await safeReadJson(rPool);
      if (!oPool.ok) throw new Error(oPool.data?.error || `pool-metrics HTTP ${oPool.status}`);

      setPool(oPool.data as PoolMetrics);
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function reloadAll() {
    setToast(null);
    await loadPool();
  }

  async function setFreeze(next: boolean) {
    try {
      setErr(null);
      setToast(null);
      setFreezeBusy(next ? "on" : "off");

      const url = next ? "/api/admin/freeze-on" : "/api/admin/freeze-off";
      const r = await fetch(url, {
        method: "POST",
        credentials: "include", // ✅ 帶上 admin cookie
        headers: { "Content-Type": "application/json" },
      });

      const o = await safeReadJson(r);
      if (!o.ok) throw new Error(o.data?.error || `freeze HTTP ${o.status}`);

      setToast(next ? "Freeze 已開啟" : "Freeze 已解除");
      await reloadAll();
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setFreezeBusy(null);
    }
  }

  useEffect(() => {
    // 先驗 admin，再載資料
    (async () => {
      await checkAdmin();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!checking && isAdmin) {
      reloadAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checking, isAdmin]);

  // 還在驗證 admin
  if (checking) {
    return (
      <div className="min-h-screen p-10" style={{ background: THEME.bg, color: THEME.muted }}>
        <div className="text-sm">Checking admin…</div>
      </div>
    );
  }

  // 理論上非 admin 會被 redirect；這裡只是保險
  if (!isAdmin) {
    return (
      <div className="min-h-screen p-10" style={{ background: THEME.bg, color: THEME.muted }}>
        <div className="text-sm">Redirecting…</div>
      </div>
    );
  }

  return (
    <Shell>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Admin Dashboard
            <span className="ml-3 align-middle text-xs font-semibold" style={{ color: THEME.muted }}>
              (protected)
            </span>
          </h1>

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
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/"
            className="rounded-full border px-3 py-1 text-xs font-semibold transition"
            style={{
              borderColor: "rgba(255,255,255,0.25)",
              color: "rgba(255,255,255,0.95)",
              background: "rgba(255,255,255,0.10)",
            }}
          >
            回公開首頁
          </Link>

          <Link
            href="/investors"
            className="rounded-full border px-3 py-1 text-xs font-semibold transition"
            style={{
              borderColor: "rgba(255,255,255,0.25)",
              color: "rgba(255,255,255,0.95)",
              background: "rgba(255,255,255,0.10)",
            }}
          >
            Investor Login
          </Link>

          <Button
            onClick={() => setFreeze(true)}
            disabled={freezeBusy !== null || freeze}
            title={freeze ? "Freeze 已是 ON" : "開啟 Freeze（投資人損益凍結）"}
          >
            {freezeBusy === "on" ? "Freeze ON…" : "Freeze ON"}
          </Button>

          <Button
            onClick={() => setFreeze(false)}
            disabled={freezeBusy !== null || !freeze}
            title={!freeze ? "Freeze 已是 OFF" : "解除 Freeze（恢復計算投資人損益）"}
            variant="ghost"
          >
            {freezeBusy === "off" ? "Freeze OFF…" : "Freeze OFF"}
          </Button>

          <Button onClick={reloadAll} disabled={freezeBusy !== null || loading} variant="ghost">
            重新載入
          </Button>
        </div>
      </div>

      {toast ? (
        <Card className="mt-4">
          <div className="text-sm" style={{ color: THEME.text }}>
            {toast}
          </div>
        </Card>
      ) : null}

      {err ? (
        <Card className="mt-4">
          <div className="text-sm font-semibold" style={{ color: THEME.bad }}>
            Error
          </div>
          <div className="mt-2 text-sm whitespace-pre-line" style={{ color: THEME.muted }}>
            {err}
          </div>
        </Card>
      ) : null}

      {/* KPI */}
      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card accent="gold">
          <Metric label="總淨值（NAV）" value={`${fmtUsd(navUsd)} 美元`} sub="USD（只讀）" />
        </Card>

        <Card accent={wtdUsd >= 0 ? "good" : "bad"}>
          <Metric
            label="本週損益（WTD）"
            value={`${wtdUsd >= 0 ? "+" : ""}${fmtUsd(wtdUsd)} 美元`}
            sub="WTD（週日歸零）"
            tone={wtdUsd >= 0 ? "good" : "bad"}
          />
        </Card>

        <Card accent="navy">
          <Metric label="淨入金（Principal）" value={`${fmtUsd(principalUsd)} 美元`} sub="入金累積 − 出金累積" />
        </Card>
      </div>

      <div className="mt-6 text-sm" style={{ color: THEME.muted }}>
        Snapshot ID：<span style={{ color: THEME.text, fontWeight: 700 }}>{pool?.snapshot_id ?? "—"}</span>
      </div>
    </Shell>
  );
}
