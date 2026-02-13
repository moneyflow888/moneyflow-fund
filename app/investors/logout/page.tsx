"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Shell, Card, THEME, Button } from "@/components/mf/MfUi";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export const dynamic = "force-dynamic";

export default function InvestorLogoutPage() {
  const [msg, setMsg] = useState("登出中…");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const sb = supabaseBrowser(); // ✅ 只在 useEffect（瀏覽器）建立
        await sb.auth.signOut();

        if (!mounted) return;
        setMsg("已登出，正在返回登入頁…");

        // ✅ 用 location 直接跳，最穩（避免 router 依賴）
        window.location.href = "/investors/login";
      } catch (e: any) {
        if (!mounted) return;
        setErr(e?.message || String(e));
        setMsg("登出失敗");
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen" style={{ background: THEME.bg, color: THEME.text }}>
      <Shell>
        <div className="max-w-lg mx-auto mt-10">
          <Card accent="gold" title="Investor Logout" subtitle="Supabase Auth">
            <div className="mt-3 text-sm" style={{ color: THEME.muted }}>
              {msg}
            </div>

            {err ? (
              <div className="mt-3 text-sm whitespace-pre-line" style={{ color: THEME.bad }}>
                {err}
              </div>
            ) : null}

            <div className="mt-5 flex gap-2">
              <Link href="/investors/login">
                <Button>回登入頁</Button>
              </Link>
              <Link href="/">
                <Button>回公開首頁</Button>
              </Link>
            </div>
          </Card>
        </div>
      </Shell>
    </div>
  );
}
