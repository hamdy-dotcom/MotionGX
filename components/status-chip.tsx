import { useTranslations } from "next-intl";
import type { VideoStatus } from "@/lib/types";

const STYLES: Record<VideoStatus, string> = {
  ready: "bg-success-bg text-success-ink",
  review: "bg-warning-bg text-warning-ink",
  draft: "bg-primary-light text-primary-dark",
  exporting: "bg-primary-lavender text-primary-dark",
  failed: "bg-danger-bg text-danger-ink",
  generating: "bg-primary-lavender text-primary-dark",
  needs_direction: "bg-warning-bg text-warning-ink",
};

export function StatusChip({ status }: { status: VideoStatus }) {
  const t = useTranslations("status");
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap ${STYLES[status]}`}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {t(status)}
    </span>
  );
}
