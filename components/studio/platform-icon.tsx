/** The small platform marks used on cards, chips and the composer. */
const PATHS: Record<string, string> = {
  instagram: '<rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" stroke-width="2"/>',
  facebook: '<path d="M14 21v-7.5h2.6l.4-3H14V8.6c0-.9.3-1.5 1.6-1.5H17V4.4a20 20 0 0 0-2.3-.1c-2.3 0-3.8 1.4-3.8 3.9v2.3H8.3v3h2.6V21z" fill="currentColor"/>',
  tiktok: '<path d="M16.5 3c.4 2.2 1.8 3.6 4 3.8v3c-1.5 0-2.8-.4-4-1.2v6.2a5.6 5.6 0 1 1-5.6-5.6h.6v3.1a2.6 2.6 0 1 0 2 2.5V3z" fill="currentColor"/>',
  linkedin: '<rect x="3" y="3" width="18" height="18" rx="3" fill="currentColor"/><path d="M7.5 10v6.5M7.5 7.3v.1M11 16.5V10m0 3.2c0-1.8 1-3.2 2.7-3.2 1.6 0 2.4 1.1 2.4 3.1v3.4" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/>',
  x: '<path d="M17.8 3h3.1l-6.8 7.8 8 10.2h-6.3l-4.9-6.4L5.3 21H2.2l7.3-8.3L1.8 3h6.4l4.4 5.9z" fill="currentColor"/>',
};
export const KIND_PATHS: Record<string, string> = {
  image: '<rect x="3.5" y="3.5" width="17" height="17" rx="2.5"/><circle cx="9" cy="9" r="1.8"/><path d="m20.5 15-5-5-9 10"/>',
  carousel: '<rect x="6.5" y="4" width="11" height="16" rx="2"/><path d="M3 7v10M21 7v10"/>',
  video: '<rect x="3" y="5" width="13.5" height="14" rx="2.5"/><path d="m16.5 10 4.5-3v10l-4.5-3"/>',
  text: '<path d="M5 6h14M5 11h14M5 16h9"/>',
  story: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M10 6h4M12 16.5v.01"/><circle cx="12" cy="11" r="2.2"/>',
  cover: '<rect x="2.5" y="6" width="19" height="9" rx="2"/><circle cx="7" cy="16" r="2.6"/><path d="M12 10h6"/>',
};

export function PlatformIcon({ p, size = 14 }: { p: string; size?: number }) {
  if (!PATHS[p]) return null;
  return <svg width={size} height={size} viewBox="0 0 24 24" aria-label={p} role="img" dangerouslySetInnerHTML={{ __html: PATHS[p] }} />;
}
export function KindIcon({ k, size = 15 }: { k: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: KIND_PATHS[k] ?? KIND_PATHS.image }} />;
}
