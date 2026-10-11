import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, className = "size-5", ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...props}
    >
      {children}
    </svg>
  );
}

// Directional icons are drawn pointing to the inline-end in LTR and flip in RTL.
export function ArrowIcon({ className = "size-5", ...props }: IconProps) {
  return (
    <Icon className={`${className} rtl:-scale-x-100`} {...props}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </Icon>
  );
}

export function ChevronIcon({ className = "size-4", ...props }: IconProps) {
  return (
    <Icon className={`${className} rtl:-scale-x-100`} {...props}>
      <path d="m9 6 6 6-6 6" />
    </Icon>
  );
}

export function SendIcon({ className = "size-5", ...props }: IconProps) {
  return (
    <Icon className={`${className} rtl:-scale-x-100`} {...props}>
      <path d="M4 12 20 4l-4 16-4-7-8-1Z" />
      <path d="m12 13 8-9" />
    </Icon>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  );
}

export function PlayIcon(props: IconProps) {
  return (
    <Icon {...props} fill="currentColor" stroke="none">
      <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" />
    </Icon>
  );
}

export function SpeakerIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 9v6h4l5 4V5L8 9H4Z" />
      <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" />
    </Icon>
  );
}

export function SparkIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" />
    </Icon>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </Icon>
  );
}

export function WalletIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="6" width="18" height="13" rx="4" />
      <path d="M3 10h18M16 14.5h1.5" />
    </Icon>
  );
}

export function DownloadIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
    </Icon>
  );
}

export function LogoutIcon({ className = "size-5", ...props }: IconProps) {
  return (
    <Icon className={`${className} rtl:-scale-x-100`} {...props}>
      <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 16l4-4-4-4M14 12H4" />
    </Icon>
  );
}

export function UploadIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 16V5M7 10l5-5 5 5M5 20h14" />
    </Icon>
  );
}

export function SpinnerIcon({ className = "size-5", ...props }: IconProps) {
  return (
    <Icon className={`${className} animate-spin`} {...props}>
      <path d="M12 3a9 9 0 1 0 9 9" />
    </Icon>
  );
}
