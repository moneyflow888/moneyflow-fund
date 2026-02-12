"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  async function login() {
    setErr(null);

    const r = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    const data = await r.json();

    if (!r.ok) {
      setErr(data?.error || "Login failed");
      return;
    }

    router.push("/admin");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="bg-[#111] p-8 rounded-xl w-80 space-y-4">
        <h1 className="text-xl font-bold">Admin Login</h1>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter password"
          className="w-full p-2 bg-[#222] rounded"
        />

        <button
          onClick={login}
          className="w-full p-2 bg-yellow-500 text-black rounded font-semibold"
        >
          Login
        </button>

        {err && <div className="text-red-400 text-sm">{err}</div>}
      </div>
    </div>
  );
}
