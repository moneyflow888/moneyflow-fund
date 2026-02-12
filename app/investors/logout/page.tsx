"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function LogoutPage() {
  const router = useRouter();
  const supabase = supabaseBrowser();

  useEffect(() => {
    supabase.auth.signOut().finally(() => {
      router.replace("/investors/login");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
