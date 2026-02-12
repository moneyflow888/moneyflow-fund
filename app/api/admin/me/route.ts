import { NextResponse } from "next/server";
import { isAdmin } from "../_utils";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}
