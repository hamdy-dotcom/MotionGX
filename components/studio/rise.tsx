import { Fragment } from "react";

const unescape = (s: string) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
export const escapeMarkup = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** The studio headline: each word rises in turn; the <b>…</b> part is the lit brand word with its highlighter stroke.
 *  Pass a string from `t.markup(key, { b: (c) => `<b>${c}</b>`, name: escapeMarkup(name) })`. */
export function Rise({ markup, as: Tag = "h1", className = "s-big", style }: { markup: string; as?: "h1" | "h2"; className?: string; style?: React.CSSProperties }) {
  const parts = [...markup.matchAll(/<b>(.*?)<\/b>|(\S+)/g)];
  return (
    <Tag className={className} style={style}>
      {parts.map((m, i) => (
        <Fragment key={i}>
          {i ? " " : null}
          <span className={m[1] != null ? "w lit" : "w"} style={{ animationDelay: m[1] != null ? `${i * 90}ms, 0s` : `${i * 90}ms` }}>
            {unescape(m[1] ?? m[2])}
          </span>
        </Fragment>
      ))}
    </Tag>
  );
}
