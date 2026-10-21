import { logoSurface } from "@/components/company-mark";
import type { Company } from "@/lib/types";

/** The brand's logo tile used across the studio (logo on the surface it was designed for, else its initial). */
export function StudioMark({ company, size = 36 }: { company: Pick<Company, "name" | "logo_url" | "logo_on_dark" | "brand_profiles">; size?: number }) {
  const colors = company.brand_profiles?.colors ?? [];
  const surface = logoSurface(company.logo_on_dark, colors) ?? "#ffffff";
  return (
    <span className="s-mark" style={{ width: size, height: size, background: company.logo_url ? surface : colors[0]?.hex ?? "var(--s-brand)", fontSize: size * 0.42 }}>
      {company.logo_url ? (
        // eslint-disable-next-line @next/next/no-img-element -- signed Supabase URL, short-lived
        <img src={company.logo_url} alt="" />
      ) : (
        company.name.trim().charAt(0)
      )}
    </span>
  );
}
