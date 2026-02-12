import { cookies } from "next/headers";

export function isAdmin() {
  return cookies().get("mf_admin")?.value === "1";
}
