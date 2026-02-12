import { cookies } from "next/headers";

export async function isAdmin(): Promise<boolean> {
  const c = await cookies(); // ✅ 你的 Next 版本需要 await
  return c.get("mf_admin")?.value === "1";
}
