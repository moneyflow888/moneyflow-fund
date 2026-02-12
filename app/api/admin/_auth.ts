import { NextRequest } from "next/server";

export function requireAdmin(req: NextRequest) {
  const token = req.headers.get("x-admin-token") || "";
  const expected = process.env.ADMIN_TOKEN || "";
  if (!expected || token !== expected) {
    return { ok: false as const, error: "UNAUTHORIZED" };
  }
  return { ok: true as const };
}
