// Capture scope (approved decision Q12, not in the sandbox): the agent may only act on the company's own
// website — the same registrable domain as companies.website_url plus its subdomains — plus pages that site
// opens itself (links clicked on it, tabs it opens, store/preview URLs, links in the confirmation emails it
// sends). Everything else is refused, and the refusal is told to the agent like any other tool result.
import { parse } from "tldts";

export type Scope = {
  domain: string;
  /** true when the URL is the company's site, a subdomain, or an origin the site opened */
  allows(url: string): boolean;
  /** remember an origin the site itself led to (navigation from an allowed page, a tab it opened, an email link) */
  open(url: string, why: string): void;
  opened: { origin: string; why: string }[];
};

const originOf = (u: string) => {
  try {
    const x = new URL(u);
    return /^https?:$/.test(x.protocol) ? x.origin : null;
  } catch {
    return null;
  }
};

export function makeScope(siteUrl: string): Scope {
  const domain = parse(siteUrl, { allowPrivateDomains: true }).domain || new URL(siteUrl).hostname;
  const opened = new Map<string, string>();
  const ownHost = (h: string) => h === domain || h.endsWith("." + domain);
  return {
    domain,
    allows(url) {
      if (/^(about:blank|data:|blob:|chrome-error:)/.test(url)) return true;
      const o = originOf(url);
      if (!o) return false;
      return ownHost(new URL(o).hostname) || opened.has(o);
    },
    open(url, why) {
      const o = originOf(url);
      if (o && !ownHost(new URL(o).hostname) && !opened.has(o)) opened.set(o, why);
    },
    get opened() {
      return [...opened].map(([origin, why]) => ({ origin, why }));
    },
  };
}
