"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Shell, Card, THEME, Button } from "@/components/mf/MfUi";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function InvestorLoginPage() {
  const router = useRouter();

  // ✅ 用 useMemo 包起來，避免在 build/分析階段就初始化
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // 如果已登入就直接回 investors
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/investors");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit() {
    try {
      setErr(null);
      setMsg(null);
      setBusy(true);

      if (!email || !password) throw new Error("請輸入 Email 與密碼");

      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace("/investors");
        return;
      }

      // signup
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;

      setMsg("註冊成功。你可以直接登入（不需要寄信）。");
      setMode("login");
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen" style={{ background: THEME.bg, color: THEME.text }}>
      <Shell>
        <div className="max-w-lg mx-auto mt-10">
          <Card
            accent="gold"
            title={mode === "login" ? "Investor Login" : "Investor Sign Up"}
            subtitle="Supabase Auth (Email / Password)"
            right={
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
            }
          >
            <div className="mt-4 grid gap-3">
              <div className="flex gap-2">
                <button
                  onClick={() => setMode("login")}
                  className="rounded-full border px-3 py-1 text-xs font-semibold"
                  style={{
                    borderColor: mode === "login" ? "rgba(226,198,128,0.42)" : "rgba(148,163,184,0.16)",
                    background: mode === "login" ? "rgba(212,175,55,0.14)" : "rgba(255,255,255,0.03)",
                    color: mode === "login" ? THEME.gold2 : THEME.muted,
                  }}
                >
                  登入
                </button>
                <button
                  onClick={() => setMode("signup")}
                  className="rounded-full border px-3 py-1 text-xs font-semibold"
                  style={{
                    borderColor: mode === "signup" ? "rgba(226,198,128,0.42)" : "rgba(148,163,184,0.16)",
                    background: mode === "signup" ? "rgba(212,175,55,0.14)" : "rgba(255,255,255,0.03)",
                    color: mode === "signup" ? THEME.gold2 : THEME.muted,
                  }}
                >
                  註冊
                </button>
              </div>

              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
                style={{
                  borderColor: "rgba(226,198,128,0.18)",
                  background: "rgba(255,255,255,0.03)",
                  color: THEME.text,
                }}
              />

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
                style={{
                  borderColor: "rgba(226,198,128,0.18)",
                  background: "rgba(255,255,255,0.03)",
                  color: THEME.text,
                }}
              />

              <Button onClick={submit} disabled={busy}>
                {busy ? "處理中…" : mode === "login" ? "登入" : "建立帳號"}
              </Button>

              {msg ? <div className="text-sm" style={{ color: THEME.good }}>{msg}</div> : null}
              {err ? <div className="text-sm" style={{ color: THEME.bad }}>{err}</div> : null}

              <div className="text-xs" style={{ color: THEME.muted }}>
                * 帳本資料之後會綁定 auth.user.id（RLS 只讓投資人看自己的資料）
              </div>
            </div>
          </Card>
        </div>
      </Shell>
    </div>
  );
}
