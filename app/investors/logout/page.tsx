"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Shell, Card, THEME, Button } from "@/components/mf/MfUi";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";

export const dynamic = "force-dynamic";

export default function InvestorLogoutPage() {
  const [msg, setMsg] = useState("登出中…");
  const [err, setErr] = useState<string | null>(null);

  // 避免 StrictMode 造成 useEffect 兩次
  const didRun = useRef(false);

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;

    let mounted = true;

    (async () => {
      try {
        const sb = getSupabaseBrowserClient();
        if (!sb) {
          // ⭐ 關鍵：sb 可能是 null（env 沒注入或不在 browser）
          throw new Error(
            "Supabase client 初始化失敗：請檢查 NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY"
          );
        }

        await sb.auth.signOut();

        if (!mounted) return;
        setMsg("已登出，正在返回登入頁…");

        setTimeout(() => {
          window.location.href = "/investors/login";
        }, 500);
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
