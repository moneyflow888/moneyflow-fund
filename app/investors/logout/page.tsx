"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Shell, Card, THEME, Button } from "@/components/mf/MfUi";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";

export const dynamic = "force-dynamic";

export default function InvestorLogoutPage() {
  const [msg, setMsg] = useState("登出中…");
  const [err, setErr] = useState<string | null>(null);

  const didRun = useRef(false);

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;

    let mounted = true;

    const run = async () => {
      try {
        const sb = getSupabaseBrowserClient();

        // ✅ 關鍵：先檢查 null
        if (!sb) {
          throw new Error("Supabase client not initialized");
        }

        await sb.auth.signOut();

        if (!mounted) return;

        setMsg("已登出，正在返回登入頁…");

        setTimeout(() => {
          window.location.href = "/investors/login";
        }, 800);
      } catch (e: any) {
        if (!mounted) return;
        setErr(e?.message || String(e));
        setMsg("登出失敗");
      }
    };

    run();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div
      className="min-h-screen"
      style={{ background: THEME.bg, color: THEME.text }}
    >
      <Shell>
        <div className="max-w-lg mx-auto mt-10">
          <Card
            accent="gold"
            title="Investor Logout"
            subtitle="Supabase Auth"
          >
            <div
              className="mt-3 text-sm"
              style={{ color: THEME.muted }}
            >
              {msg}
            </div>

            {err && (
              <div
                className="mt-3 text-sm whitespace-pre-line"
                style={{ color: THEME.bad }}
              >
                {err}
              </div>
            )}

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
