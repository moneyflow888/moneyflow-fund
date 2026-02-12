import { NextResponse } from "next/server";
import { requireAdmin } from "../_utils";

export async function GET() {
  if (!requireAdmin()) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
