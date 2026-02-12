"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Shell, Card, Button, THEME } from "@/components/mf/MfUi";

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

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onLogin() {
    try {
      setErr(null);
      setBusy(true);

      const r = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password }),
      });

      const o = await safeReadJson(r);
      if (!o.ok) throw new Error(o.data?.error || `LOGIN HTTP ${o.status}`);

      router.push("/admin");
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen" style={{ background: THEME.bg, color: THEME.text }}>
      <Shell>
        <div className="max-w-md mx-auto mt-10">
          <Card accent="gold" title="Admin Login" subtitle="Only for fund operator">
            <div className="mt-4 grid gap-3">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter ADMIN_PASSWORD"
                className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
                style={{
                  borderColor: "rgba(226,198,128,0.18)",
                  background: "rgba(255,255,255,0.03)",
                  color: THEME.text,
                }}
              />

              <Button onClick={onLogin} disabled={busy || !password}>
                {busy ? "Logging in…" : "Login"}
              </Button>

              {err ? (
                <div className="text-sm whitespace-pre-line" style={{ color: THEME.bad }}>
                  {err}
                </div>
              ) : (
                <div className="text-xs" style={{ color: THEME.muted }}>
                  登入成功後會寫入 cookie（mf_admin=1），才能使用 Freeze ON/OFF。
                </div>
              )}
            </div>
          </Card>
        </div>
      </Shell>
    </div>
  );
}
