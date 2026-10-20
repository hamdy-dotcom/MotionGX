"use client";

// How the post will look on each platform — its real feed layout, on a phone or in a desktop browser: the account
// header, the image at the platform's shape (carousel dots), the caption as the platform truncates it, the actions.
import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { CompanyMark } from "@/components/company-mark";
import type { PostPlatformKey } from "@/lib/posts/config";
import type { BrandColor } from "@/lib/types";

export type PreviewBrand = { name: string; logoUrl: string | null; logoOnDark?: boolean | null; colors: BrandColor[]; site?: string | null };
type Props = { platform: PostPlatformKey; device: "mobile" | "desktop"; images: string[]; text: string; hashtags: string[]; brand: PreviewBrand; alt: string };

const handleOf = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "") || "brand";
const hostOf: Record<PostPlatformKey, string> = { instagram: "instagram.com", facebook: "facebook.com", tiktok: "tiktok.com", linkedin: "linkedin.com/feed", x: "x.com/home" };

export function PlatformPreview(props: Props) {
  const body = { instagram: <Instagram {...props} />, facebook: <Facebook {...props} />, linkedin: <LinkedIn {...props} />, tiktok: <TikTok {...props} />, x: <X {...props} /> }[props.platform];
  return props.device === "mobile" ? <Phone dark={props.platform === "tiktok"}>{body}</Phone> : <Browser host={hostOf[props.platform]} dark={props.platform === "tiktok"}>{body}</Browser>;
}

// ── device frames ─────────────────────────────────────────────────────────────────────────────────────
function Phone({ children, dark }: { children: ReactNode; dark?: boolean }) {
  return (
    <div className="mx-auto w-full max-w-[380px] rounded-[46px] bg-navy p-[10px] shadow-[0_30px_80px_rgba(15,17,40,.25)]">
      <div className={`relative overflow-hidden rounded-[36px] ${dark ? "bg-black text-white" : "bg-white text-[#111]"}`}>
        <div className={`flex items-center justify-between px-6 pt-3 pb-1 text-[11px] font-semibold ${dark ? "text-white" : "text-[#111]"}`} dir="ltr">
          <span>9:41</span>
          <span className="h-5 w-24 rounded-full bg-navy" aria-hidden="true" />
          <span aria-hidden="true">▂▄▆ ◔</span>
        </div>
        <div className="max-h-[720px] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

function Browser({ children, host, dark }: { children: ReactNode; host: string; dark?: boolean }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_20px_60px_rgba(15,17,40,.15)]">
      <div className="flex items-center gap-2 border-b border-black/10 bg-[#f1f3f4] px-3 py-2" dir="ltr">
        <span className="size-2.5 rounded-full bg-[#ff5f57]" />
        <span className="size-2.5 rounded-full bg-[#febc2e]" />
        <span className="size-2.5 rounded-full bg-[#28c840]" />
        <span className="ms-3 flex-1 truncate rounded-full bg-white px-3 py-1 text-[11px] text-[#5f6368]">{host}</span>
      </div>
      <div className={`max-h-[760px] overflow-y-auto ${dark ? "bg-black text-white" : "bg-[#f0f2f5] text-[#111]"}`}>{children}</div>
    </div>
  );
}

// ── shared pieces ─────────────────────────────────────────────────────────────────────────────────────
function Media({ images, ratio, alt, rounded = "", dots = "below" }: { images: string[]; ratio: string; alt: string; rounded?: string; dots?: "below" | "over" }) {
  const [i, setI] = useState(0);
  if (!images.length) return null;
  return (
    <div>
      <div className={`relative w-full overflow-hidden bg-black ${ratio} ${rounded}`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- signed storage URLs, shown as they are */}
        <img src={images[i]} alt={alt} className="size-full object-cover" />
        {images.length > 1 ? (
          <>
            <button type="button" onClick={() => setI((n) => Math.max(0, n - 1))} disabled={i === 0} className="absolute start-2 top-1/2 size-7 -translate-y-1/2 rounded-full bg-white/85 text-sm text-black shadow disabled:opacity-0" aria-label="‹">
              <span className="rtl:-scale-x-100 inline-block">‹</span>
            </button>
            <button type="button" onClick={() => setI((n) => Math.min(images.length - 1, n + 1))} disabled={i === images.length - 1} className="absolute end-2 top-1/2 size-7 -translate-y-1/2 rounded-full bg-white/85 text-sm text-black shadow disabled:opacity-0" aria-label="›">
              <span className="rtl:-scale-x-100 inline-block">›</span>
            </button>
            <span className="absolute end-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] text-white" dir="ltr">
              {i + 1}/{images.length}
            </span>
            {dots === "over" ? <Dots n={images.length} i={i} className="absolute inset-x-0 bottom-2" light /> : null}
          </>
        ) : null}
      </div>
      {images.length > 1 && dots === "below" ? <Dots n={images.length} i={i} className="mt-2" /> : null}
    </div>
  );
}

function Dots({ n, i, className = "", light }: { n: number; i: number; className?: string; light?: boolean }) {
  return (
    <div className={`flex justify-center gap-1 ${className}`} aria-hidden="true">
      {Array.from({ length: n }, (_, k) => (
        <span key={k} className={`size-1.5 rounded-full ${k === i ? (light ? "bg-white" : "bg-[#0095f6]") : light ? "bg-white/50" : "bg-black/20"}`} />
      ))}
    </div>
  );
}

/** a caption as the platform shows it: cut after `cut` characters (or `lines` lines) with its own "more" */
function Caption({ text, hashtags, cut, more, tagColor, prefix, lines }: { text: string; hashtags: string[]; cut?: number; more: string; tagColor: string; prefix?: ReactNode; lines?: number }) {
  const [open, setOpen] = useState(false);
  const tags = hashtags.map((h) => `#${h}`).join(" ");
  const full = `${text}${tags ? `\n\n${tags}` : ""}`;
  const short = cut && !open && full.length > cut;
  const shown = short ? full.slice(0, cut).replace(/\s+\S*$/, "") : full;
  const parts = shown.split(/(#[^\s#]+)/g);
  return (
    <div dir="auto" className="text-[13.5px] leading-[1.45]">
      <p className={`whitespace-pre-wrap ${lines && !open ? (lines === 2 ? "line-clamp-2" : "line-clamp-3") : ""}`}>
        {prefix}
        {parts.map((p, k) => (p.startsWith("#") ? <span key={k} style={{ color: tagColor }}>{p}</span> : <span key={k}>{p}</span>))}
        {short ? "… " : null}
        {short ? <button type="button" onClick={() => setOpen(true)} className="opacity-60">{more}</button> : null}
      </p>
      {lines && !open && full.split("\n").length + full.length / 60 > lines ? (
        <button type="button" onClick={() => setOpen(true)} className="mt-0.5 text-[13px] opacity-60">
          {more}
        </button>
      ) : null}
    </div>
  );
}

const I = {
  heart: <path d="M12 21s-7.5-4.6-9.5-9.2C1.2 8.6 3.3 5 6.8 5c2 0 3.4 1.1 4.2 2.4h2C13.8 6.1 15.2 5 17.2 5c3.5 0 5.6 3.6 4.3 6.8C19.5 16.4 12 21 12 21z" />,
  comment: <path d="M20.5 11.5a8.5 8.5 0 0 1-12.6 7.4L3.5 20.5l1.6-4.2A8.5 8.5 0 1 1 20.5 11.5z" />,
  send: <path d="M21.5 3 3 10.4l7 2.6 2.6 7L21.5 3zM10 13l5-5" />,
  save: <path d="M6 3.5h12v17l-6-4.5-6 4.5z" />,
  repost: <path d="M4 9V7a2 2 0 0 1 2-2h12l-3-3m5 13v2a2 2 0 0 1-2 2H6l3 3" />,
  share: <path d="M12 3v12m0-12 4 4m-4-4L8 7M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />,
  views: <path d="M4 20V10m5 10V4m5 16v-7m5 7V8" />,
  like: <path d="M7 10v10H4V10zm0 0 4-7c1.5 0 2.5 1 2.2 2.7L12.6 9H19a2 2 0 0 1 2 2.3l-1.2 7A2 2 0 0 1 17.8 20H7" />,
  more: <path d="M5 12h.01M12 12h.01M19 12h.01" strokeWidth={3} />,
};
function Icon({ d, className = "size-6" }: { d: ReactNode; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {d}
    </svg>
  );
}

function Avatar({ brand, size = "size-8", ring }: { brand: PreviewBrand; size?: string; ring?: boolean }) {
  return (
    <span className={`inline-flex shrink-0 rounded-full ${ring ? "bg-gradient-to-tr from-[#feda75] via-[#d62976] to-[#4f5bd5] p-[2px]" : ""}`}>
      <span className="rounded-full bg-white p-[1px]">
        <CompanyMark name={brand.name} logoUrl={brand.logoUrl} logoOnDark={brand.logoOnDark} colors={brand.colors} size={size} />
      </span>
    </span>
  );
}

// ── Instagram ─────────────────────────────────────────────────────────────────────────────────────────
function Instagram({ device, images, text, hashtags, brand, alt }: Props) {
  const t = useTranslations("posts.preview");
  const handle = handleOf(brand.name);
  const head = (
    <div className="flex items-center gap-2.5 px-3 py-2.5">
      <Avatar brand={brand} ring />
      <span className="text-[13.5px] font-semibold" dir="ltr">{handle}</span>
      <Icon d={I.more} className="ms-auto size-5" />
    </div>
  );
  const actions = (
    <div className="flex items-center gap-3.5 px-3 pt-2.5">
      <Icon d={I.heart} />
      <Icon d={I.comment} />
      <Icon d={I.send} />
      <Icon d={I.save} className="ms-auto size-6" />
    </div>
  );
  const caption = <Caption text={text} hashtags={hashtags} cut={125} more={t("more")} tagColor="#00376b" prefix={<b className="me-1.5 font-semibold" dir="ltr">{handle}</b>} />;
  if (device === "mobile")
    return (
      <div className="pb-4">
        <div className="flex items-center justify-between px-3 pb-1.5 pt-1">
          <span className="font-serif text-[22px] italic tracking-tight" dir="ltr">Instagram</span>
          <span className="flex gap-4"><Icon d={I.heart} /><Icon d={I.send} /></span>
        </div>
        {head}
        <Media images={images} ratio="aspect-[4/5]" alt={alt} />
        {actions}
        <div className="px-3 pt-2">{caption}</div>
        <p className="px-3 pt-1.5 text-[11px] uppercase opacity-50">{t("now")}</p>
      </div>
    );
  return (
    <div className="p-5">
      <div className="mx-auto flex max-w-[860px] overflow-hidden rounded-md border border-black/10 bg-white">
        <div className="w-[58%] shrink-0 bg-black">
          <Media images={images} ratio="aspect-[4/5]" alt={alt} dots="over" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="border-b border-black/10">{head}</div>
          <div className="flex-1 overflow-y-auto px-3 py-3">
            <div className="flex gap-2.5">
              <Avatar brand={brand} size="size-7" />
              <Caption text={text} hashtags={hashtags} more={t("more")} tagColor="#00376b" prefix={<b className="me-1.5 font-semibold" dir="ltr">{handle}</b>} />
            </div>
          </div>
          <div className="border-t border-black/10 pb-3">
            {actions}
            <p className="px-3 pt-1.5 text-[11px] uppercase opacity-50">{t("now")}</p>
            <p className="mx-3 mt-2 border-t border-black/10 pt-2.5 text-[13px] opacity-50">{t("addComment")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Facebook ──────────────────────────────────────────────────────────────────────────────────────────
function Facebook({ device, images, text, hashtags, brand, alt }: Props) {
  const t = useTranslations("posts.preview");
  const card = (
    <div className={`bg-white ${device === "desktop" ? "rounded-lg shadow-sm" : ""}`}>
      <div className="flex items-center gap-2.5 px-4 pb-2 pt-3">
        <Avatar brand={brand} size="size-10" />
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold">{brand.name}</p>
          <p className="text-[12px] text-[#65676b]">{t("now")} · 🌐</p>
        </div>
        <Icon d={I.more} className="ms-auto size-5 text-[#65676b]" />
      </div>
      <div className="px-4 pb-3 text-[15px]">
        <Caption text={text} hashtags={hashtags} more={t("seeMore")} tagColor="#1877f2" lines={3} />
      </div>
      <Media images={images} ratio="aspect-[4/5]" alt={alt} />
      <div className="mx-4 flex items-center justify-between border-b border-black/10 py-2 text-[13px] text-[#65676b]">
        <span>👍❤️ 0</span>
        <span>0 {t("comments")}</span>
      </div>
      <div className="flex justify-around px-2 py-1 text-[14px] font-semibold text-[#65676b]">
        <span className="flex items-center gap-1.5 py-1.5"><Icon d={I.like} className="size-5" />{t("like")}</span>
        <span className="flex items-center gap-1.5 py-1.5"><Icon d={I.comment} className="size-5" />{t("comment")}</span>
        <span className="flex items-center gap-1.5 py-1.5"><Icon d={I.share} className="size-5" />{t("share")}</span>
      </div>
    </div>
  );
  if (device === "mobile")
    return (
      <div className="bg-[#c9ccd1] pb-2">
        <div className="flex items-center justify-between bg-white px-4 pb-2 pt-1">
          <span className="text-[26px] font-bold tracking-tight text-[#1877f2]" dir="ltr">facebook</span>
        </div>
        <div className="mt-2">{card}</div>
      </div>
    );
  return <div className="mx-auto max-w-[540px] px-4 py-6">{card}</div>;
}

// ── LinkedIn ──────────────────────────────────────────────────────────────────────────────────────────
function LinkedIn({ device, images, text, hashtags, brand, alt }: Props) {
  const t = useTranslations("posts.preview");
  const card = (
    <div className={`bg-white ${device === "desktop" ? "rounded-lg border border-black/10" : ""}`}>
      <div className="flex items-start gap-2.5 px-4 pb-2 pt-3">
        <span className="overflow-hidden rounded-md">
          <CompanyMark name={brand.name} logoUrl={brand.logoUrl} logoOnDark={brand.logoOnDark} colors={brand.colors} size="size-12" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[14px] font-semibold">{brand.name}</p>
          <p className="text-[12px] text-[#666]">{t("followers")}</p>
          <p className="text-[12px] text-[#666]">{t("now")} · 🌐</p>
        </div>
        <span className="ms-auto text-[14px] font-semibold text-[#0a66c2]">+ {t("follow")}</span>
      </div>
      <div className="px-4 pb-2 text-[14px]">
        <Caption text={text} hashtags={hashtags} more={t("seeMoreLinkedIn")} tagColor="#0a66c2" lines={3} />
      </div>
      <Media images={images} ratio="aspect-[4/5]" alt={alt} />
      <div className="mx-4 border-b border-black/10 py-2 text-[12px] text-[#666]">👍💡 0</div>
      <div className="flex justify-around px-2 py-1 text-[13px] font-semibold text-[#666]">
        <span className="flex flex-col items-center gap-0.5 py-1.5 sm:flex-row sm:gap-1.5"><Icon d={I.like} className="size-5" />{t("like")}</span>
        <span className="flex flex-col items-center gap-0.5 py-1.5 sm:flex-row sm:gap-1.5"><Icon d={I.comment} className="size-5" />{t("comment")}</span>
        <span className="flex flex-col items-center gap-0.5 py-1.5 sm:flex-row sm:gap-1.5"><Icon d={I.repost} className="size-5" />{t("repost")}</span>
        <span className="flex flex-col items-center gap-0.5 py-1.5 sm:flex-row sm:gap-1.5"><Icon d={I.send} className="size-5" />{t("send")}</span>
      </div>
    </div>
  );
  if (device === "mobile") return <div className="bg-[#f4f2ee] pb-2 pt-1">{card}</div>;
  return <div className="mx-auto max-w-[560px] bg-[#f4f2ee] px-4 py-6">{card}</div>;
}

// ── TikTok ────────────────────────────────────────────────────────────────────────────────────────────
function TikTok({ device, images, text, hashtags, brand, alt }: Props) {
  const t = useTranslations("posts.preview");
  const handle = handleOf(brand.name);
  const rail = (
    <div className="flex flex-col items-center gap-4 text-white">
      <Avatar brand={brand} size="size-11" />
      {[I.heart, I.comment, I.save, I.share].map((d, k) => (
        <span key={k} className="flex flex-col items-center text-[11px]">
          <Icon d={d} className="size-8" />0
        </span>
      ))}
    </div>
  );
  const cap = (
    <div className="text-white">
      <p className="text-[15px] font-semibold" dir="ltr">@{handle}</p>
      <Caption text={text} hashtags={hashtags} more={t("more")} tagColor="#ffffff" lines={2} />
    </div>
  );
  if (device === "mobile")
    return (
      <div className="relative aspect-[9/16] w-full bg-black">
        <div className="absolute inset-0">
          <Media images={images} ratio="aspect-[9/16]" alt={alt} dots="over" />
        </div>
        <div className="absolute end-2 bottom-24">{rail}</div>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 pb-4 pt-16 pe-16">{cap}</div>
      </div>
    );
  return (
    <div className="flex items-end justify-center gap-4 px-6 py-6">
      <div className="w-[300px] shrink-0 overflow-hidden rounded-xl">
        <Media images={images} ratio="aspect-[9/16]" alt={alt} dots="over" />
      </div>
      <div className="pb-2">{rail}</div>
      <div className="hidden max-w-[260px] pb-2 lg:block">{cap}</div>
    </div>
  );
}

// ── X ─────────────────────────────────────────────────────────────────────────────────────────────────
function X({ device, images, text, hashtags, brand, alt }: Props) {
  const t = useTranslations("posts.preview");
  const handle = handleOf(brand.name);
  const post = (
    <div className="flex gap-2.5 border-b border-black/10 bg-white px-4 py-3">
      <Avatar brand={brand} size="size-10" />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-1 text-[15px]">
          <b className="font-bold">{brand.name}</b>
          <span className="text-[#536471]" dir="ltr">@{handle} · {t("nowShort")}</span>
        </p>
        <div className="mt-0.5 text-[15px]">
          <Caption text={text} hashtags={hashtags} more={t("more")} tagColor="#1d9bf0" />
        </div>
        {images.length > 1 ? (
          <div className="mt-3 grid grid-cols-2 gap-0.5 overflow-hidden rounded-2xl border border-black/10">
            {images.slice(0, 4).map((src, k) => (
              // eslint-disable-next-line @next/next/no-img-element -- signed storage URLs
              <img key={k} src={src} alt={alt} className="aspect-[16/9] w-full object-cover" />
            ))}
          </div>
        ) : images.length ? (
          <div className="mt-3 overflow-hidden rounded-2xl border border-black/10">
            <Media images={images} ratio="aspect-[16/9]" alt={alt} />
          </div>
        ) : null}
        <div className="mt-3 flex max-w-[420px] justify-between text-[13px] text-[#536471]">
          {[I.comment, I.repost, I.heart, I.views].map((d, k) => (
            <span key={k} className="flex items-center gap-1"><Icon d={d} className="size-[18px]" />0</span>
          ))}
          <span className="flex gap-3"><Icon d={I.save} className="size-[18px]" /><Icon d={I.share} className="size-[18px]" /></span>
        </div>
      </div>
    </div>
  );
  if (device === "mobile")
    return (
      <div className="bg-white">
        <div className="flex justify-center border-b border-black/10 py-2 text-[22px] font-bold" dir="ltr">𝕏</div>
        {post}
      </div>
    );
  return (
    <div className="bg-white">
      <div className="mx-auto max-w-[600px] border-x border-black/10">
        <div className="border-b border-black/10 px-4 py-3 text-[17px] font-bold">{t("home")}</div>
        {post}
      </div>
    </div>
  );
}
