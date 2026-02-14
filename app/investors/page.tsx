"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import { Shell, Card, Metric, THEME, Button } from "@/components/mf/MfUi";

type LedgerResponse = {
  email?: string | null;
  principal_usd?: number | null;
  pending_withdraw_usd?: number | null;
  investor_pnl_usd?: number | null;
  frozen?: boolean;
  nav_usd?: number | null;
  snapshot_id?: number | null;
};

type ReqRow = {
  id: number;
  amount_usd: number;
  status: string;
  note: string | null;
  created_at: string;
};

function fmt(n: unknown): string {
  const x = Number(n);
  if (!Number.isFinite(x)) return "—";
  return x.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export default function InvestorsPage() {
  const [email, setEmail] = useState<string | null>(null);

  const [ledger, setLedger] = useState<LedgerResponse | null>(null);
  const [ledgerErr, setLedgerErr] = useState<string | null>(null);

  const [depAmt, setDepAmt] = useState<string>("1000");
  const [depNote, setDepNote] = useState<string>("");
  const [depRows, setDepRows] = useState<ReqRow[]>([]);
  const [depErr, setDepErr] = useState<string | null>(null);
  const [depBusy, setDepBusy] = useState(false);

  const [wdAmt, setWdAmt] = useState<string>("100");
  const [wdNote, setWdNote] = useState<string>("");
  const [wdRows, setWdRows] = useState<ReqRow[]>([]);
  const [wdErr, setWdErr] = useState<string | null>(null);
  const [wdBusy, setWdBusy] = useState(false);

  const frozen = !!ledger?.frozen;

  async function getAccessToken(): Promise<string | null> {
    const sb = getSupabaseBrowserClient();
    if (!sb) return null;
    const { data, error } = await sb.auth.getSession();
    if (error) return null;
    return data.session?.access_token ?? null;
  }

  async function loadAll() {
    setLedgerErr(null);
    setDepErr(null);
    setWdErr(null);

    const token = await getAccessToken();
    if (!token) {
      setLedgerErr("Not logged in.");
      return;
    }

    // 1) ledger
    try {
      const r = await fetch("/api/investor/ledger", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "ledger failed");
      setLedger(j);
      if (j?.email) setEmail(j.email);
    } catch (e: any) {
      setLedgerErr(e?.message ?? "ledger error");
    }

    // 2) deposits list
    try {
      const r = await fetch("/api/investor/deposits", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "deposits failed");
      setDepRows(j?.rows ?? []);
    } catch (e: any) {
      setDepErr(e?.message ?? "deposits error");
    }

    // 3) withdraws list
    try {
      const r = await fetch("/api/investor/withdraws", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "withdraws failed");
      setWdRows(j?.rows ?? []);
    } catch (e: any) {
      setWdErr(e?.message ?? "withdraws error");
    }
  }

  useEffect(() => {
    let mounted = true;

    (async () => {
      const sb = getSupabaseBrowserClient();
      if (!sb) return;

      try {
        const { data, error } = await sb.auth.getUser();
        if (!mounted) return;
        if (error) throw error;
        setEmail(data.user?.email ?? null);
      } catch {
        if (!mounted) return;
        setEmail(null);
      }

      if (mounted) await loadAll();
    })();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function logout() {
    const sb = getSupabaseBrowserClient();
    if (sb) await sb.auth.signOut();
    window.location.href = "/investors/login";
  }

  async function submitDeposit() {
    setDepErr(null);
    setDepBusy(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Not logged in");

      const amount_usd = Number(depAmt);
      if (!Number.isFinite(amount_usd) || amount_usd <= 0) {
        throw new Error("請輸入正確的入金金額（> 0）");
      }

      const r = await fetch("/api/investor/deposit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount_usd, note: depNote || null }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "deposit failed");

      setDepNote("");
      await loadAll();
    } catch (e: any) {
      setDepErr(e?.message ?? "deposit error");
    } finally {
      setDepBusy(false);
    }
  }

  async function submitWithdraw() {
    setWdErr(null);
    setWdBusy(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Not logged in");

      const amount_usd = Number(wdAmt);
      if (!Number.isFinite(amount_usd) || amount_usd <= 0) {
        throw new Error("請輸入正確的提款金額（> 0）");
      }

      const r = await fetch("/api/investor/withdraw", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount_usd, note: wdNote || null }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "withdraw failed");

      setWdNote("");
      await loadAll();
    } catch (e: any) {
      setWdErr(e?.message ?? "withdraw error");
    } finally {
      setWdBusy(false);
    }
  }

  const headerLeft = (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: THEME.text }}>
        Investor Portal
      </div>
      <div style={{ fontSize: 12, color: THEME.muted }}>
        {email ? `Logged in as ${email}` : "Not logged in"}
      </div>
    </div>
  );

  const headerRight = (
    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
      <Button onClick={loadAll}>重新載入</Button>
      <Button onClick={logout} variant="ghost" title="Logout">
        登出
      </Button>
    </div>
  );

  return (
    <div
      className="min-h-screen"
      style={{ background: THEME.bg, color: THEME.text }}
    >
      <Shell headerLeft={headerLeft} headerRight={headerRight}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(12, 1fr)",
            gap: 14,
          }}
        >
          <div style={{ gridColumn: "span 12" }}>
            <Card
              title="我的帳本（只吃 SETTLED）"
              accent={frozen ? "gold" : "none"}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(12, 1fr)",
                  gap: 14,
                }}
              >
                <div style={{ gridColumn: "span 4" }}>
                  <Metric
                    label="我的淨入金 (Principal)"
                    value={`${fmt(ledger?.principal_usd)} USD`}
                  />
                </div>
                <div style={{ gridColumn: "span 4" }}>
                  <Metric
                    label="我的待提款 (Pending)"
                    value={`${fmt(ledger?.pending_withdraw_usd)} USD`}
                  />
                </div>
                <div style={{ gridColumn: "span 4" }}>
                  <Metric
                    label={frozen ? "目前損益 (Frozen)" : "目前損益 (PnL)"}
                    value={`${fmt(ledger?.investor_pnl_usd)} USD`}
                    tone={frozen ? "neutral" : "good"}
                  />
                </div>

                <div style={{ gridColumn: "span 12", opacity: 0.75, fontSize: 12 }}>
                  規則：principal 只計入 status=SETTLED。你現在送出 PENDING 不會影響 principal（直到你 Admin 結算）。
                </div>

                {ledgerErr ? (
                  <div
                    style={{
                      gridColumn: "span 12",
                      color: "rgba(255,120,120,0.9)",
                    }}
                  >
                    {ledgerErr}
                  </div>
                ) : null}
              </div>
            </Card>
          </div>

          <div style={{ gridColumn: "span 6" }}>
            <Card title="入金申請（PENDING）" accent="none">
              <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
                <input
                  value={depAmt}
                  onChange={(e) => setDepAmt(e.target.value)}
                  placeholder="amount_usd"
                  style={{
                    flex: 1,
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: `1px solid ${THEME.border}`,
                    background: "rgba(0,0,0,0.25)",
                    color: THEME.text,
                  }}
                />
                <Button onClick={submitDeposit} disabled={depBusy}>
                  {depBusy ? "送出中…" : "提交入金"}
                </Button>
              </div>

              <input
                value={depNote}
                onChange={(e) => setDepNote(e.target.value)}
                placeholder="備註（選填）"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: `1px solid ${THEME.border}`,
                  background: "rgba(0,0,0,0.25)",
                  color: THEME.text,
                  marginBottom: 12,
                }}
              />

              {depErr ? (
                <div style={{ color: "rgba(255,120,120,0.9)", marginBottom: 10 }}>
                  {depErr}
                </div>
              ) : null}

              <div style={{ display: "grid", gap: 8 }}>
                {depRows.length === 0 ? (
                  <div style={{ opacity: 0.7 }}>尚無入金申請</div>
                ) : (
                  depRows.map((r) => (
                    <div
                      key={r.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                        padding: "10px 12px",
                        borderRadius: 12,
                        border: `1px solid ${THEME.border}`,
                        background: THEME.panel2,
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 13, opacity: 0.95 }}>
                          #{r.id} · {fmt(r.amount_usd)} USD · {r.status}
                        </div>
                        <div style={{ fontSize: 12, opacity: 0.65 }}>
                          {new Date(r.created_at).toLocaleString()}{" "}
                          {r.note ? `· ${r.note}` : ""}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>

          <div style={{ gridColumn: "span 6" }}>
            <Card title="提款申請（PENDING）" accent="none">
              <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
                <input
                  value={wdAmt}
                  onChange={(e) => setWdAmt(e.target.value)}
                  placeholder="amount_usd"
                  style={{
                    flex: 1,
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: `1px solid ${THEME.border}`,
                    background: "rgba(0,0,0,0.25)",
                    color: THEME.text,
                  }}
                />
                <Button onClick={submitWithdraw} disabled={wdBusy} variant="ghost">
                  {wdBusy ? "送出中…" : "提交提款"}
                </Button>
              </div>

              <input
                value={wdNote}
                onChange={(e) => setWdNote(e.target.value)}
                placeholder="備註（選填）"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: `1px solid ${THEME.border}`,
                  background: "rgba(0,0,0,0.25)",
                  color: THEME.text,
                  marginBottom: 12,
                }}
              />

              {wdErr ? (
                <div style={{ color: "rgba(255,120,120,0.9)", marginBottom: 10 }}>
                  {wdErr}
                </div>
              ) : null}

              <div style={{ display: "grid", gap: 8 }}>
                {wdRows.length === 0 ? (
                  <div style={{ opacity: 0.7 }}>尚無提款申請</div>
                ) : (
                  wdRows.map((r) => (
                    <div
                      key={r.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                        padding: "10px 12px",
                        borderRadius: 12,
                        border: `1px solid ${THEME.border}`,
                        background: THEME.panel2,
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 13, opacity: 0.95 }}>
                          #{r.id} · {fmt(r.amount_usd)} USD · {r.status}
                        </div>
                        <div style={{ fontSize: 12, opacity: 0.65 }}>
                          {new Date(r.created_at).toLocaleString()}{" "}
                          {r.note ? `· ${r.note}` : ""}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>

          <div style={{ gridColumn: "span 12", opacity: 0.7, fontSize: 12 }}>
            提醒：這是 Sprint 1（只打通 PENDING 管線）。要讓 principal 變動，下一步 Sprint 2 會做 Admin 結算（PENDING → SETTLED）。
          </div>

          <div style={{ gridColumn: "span 12", opacity: 0.7, fontSize: 12 }}>
            <Link href="/">回首頁</Link>
          </div>
        </div>
      </Shell>
    </div>
  );
}
