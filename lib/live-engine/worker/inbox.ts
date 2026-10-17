// Port of video-sandbox/lib/inbox.mjs — throwaway inbox for sign-ups (mail.tm public API) so email
// confirmations need no human. If the service is unreachable or the site rejects the address, the agent
// falls back to asking.
/* eslint-disable @typescript-eslint/no-explicit-any */
const API = "https://api.mail.tm";
const j = async (url: string, opts: any = {}) => {
  const r = await fetch(API + url, { ...opts, headers: { "Content-Type": "application/json", ...(opts.headers || {}) } });
  if (!r.ok) throw new Error(`mail.tm ${url} ${r.status}`);
  return r.status === 204 ? null : r.json();
};

export type Mail = { from: string; subject: string; text: string; links: string[]; codes: string[] };
export type Inbox = { address: string; waitForMail(seconds?: number): Promise<Mail | null> };

export async function createInbox(): Promise<Inbox> {
  const domains = await j("/domains");
  const domain = (domains["hydra:member"] || domains)[0]?.domain;
  if (!domain) throw new Error("mail.tm: no domain");
  const address = `vt${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}@${domain}`;
  const password = "Vt!" + Math.random().toString(36).slice(2, 12);
  await j("/accounts", { method: "POST", body: JSON.stringify({ address, password }) });
  const { token } = await j("/token", { method: "POST", body: JSON.stringify({ address, password }) });
  const seen = new Set<string>();
  return {
    address,
    /** wait up to `seconds` for a new message; returns { from, subject, text, links, codes } or null */
    async waitForMail(seconds = 90) {
      const end = Date.now() + seconds * 1000;
      while (Date.now() < end) {
        const list = await j("/messages", { headers: { Authorization: `Bearer ${token}` } }).catch(() => null);
        const msg = (list?.["hydra:member"] || []).find((m: any) => !seen.has(m.id));
        if (msg) {
          seen.add(msg.id);
          const full = await j(`/messages/${msg.id}`, { headers: { Authorization: `Bearer ${token}` } });
          const html = ([] as string[]).concat(full.html || []).join("\n"),
            text = full.text || html.replace(/<[^>]+>/g, " ");
          const links = [...new Set([...html.matchAll(/href=["']([^"']+)["']/gi)].map((m) => m[1].replace(/&amp;/g, "&")).concat(text.match(/https?:\/\/[^\s"'<>)]+/g) || []))].filter((u) => /^https?:/.test(u) && !/unsubscribe|privacy|facebook|twitter|instagram|linkedin|youtube/i.test(u));
          const codes = [...new Set<string>(text.match(/\b\d{4,8}\b/g) || [])].slice(0, 5);
          return { from: full.from?.address, subject: full.subject, text: text.replace(/\s+/g, " ").slice(0, 600), links: links.slice(0, 8), codes };
        }
        await new Promise((r) => setTimeout(r, 4000));
      }
      return null;
    },
  };
}
