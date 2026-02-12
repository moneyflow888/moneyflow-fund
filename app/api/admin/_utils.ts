import { cookies } from "next/headers";

export function requireAdmin() {
  const v = cookies().get("mf_admin")?.value;
  if (v !== "1") {
    return false;
  }
  return true;
}
