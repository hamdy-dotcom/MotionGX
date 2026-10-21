import "server-only";
import { cookies } from "next/headers";
import type { Company } from "@/lib/types";

export const ACTIVE_COMPANY_COOKIE = "mgx_company";

/** The brand the user is working on: the one in the cookie when it is still theirs, else the newest. */
export async function activeCompany(companies: Company[], prefer?: string | null): Promise<Company | null> {
  const fromCookie = (await cookies()).get(ACTIVE_COMPANY_COOKIE)?.value;
  return companies.find((c) => c.id === prefer) ?? companies.find((c) => c.id === fromCookie) ?? companies[0] ?? null;
}
