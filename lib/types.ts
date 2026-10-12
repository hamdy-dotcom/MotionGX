export const DIALECTS = ["eg", "sa", "gulf", "lev", "msa", "en"] as const;
export type Dialect = (typeof DIALECTS)[number];

export const GOALS = ["sell", "launch", "offer", "about", "hiring", "occasion"] as const;
export type Goal = (typeof GOALS)[number];

export const FORMATS = ["9:16", "1:1", "16:9"] as const;
export type VideoFormat = (typeof FORMATS)[number];

export const LENGTHS = [15, 30, 60] as const;
export type VideoLength = (typeof LENGTHS)[number];

export const PACES = ["calm", "medium", "fast"] as const;
export type Pace = (typeof PACES)[number];

export type VideoStatus = "draft" | "ready" | "review" | "exporting" | "failed";
export type RenderStatus = "queued" | "rendering" | "done" | "failed";
export type LedgerKind = "topup" | "export" | "refund" | "adjustment";
export type Role = "owner" | "admin" | "editor" | "viewer";

export type Workspace = {
  id: string;
  name: string;
  country_code: string;
  currency_code: string;
  wallet_balance_usd: number;
  monthly_cap_usd: number | null;
};

export type BrandColor = { hex: string; role?: string };
export type BrandFonts = { arabic?: string; latin?: string };

export type BrandProfile = {
  colors: BrandColor[];
  fonts: BrandFonts;
  tone: string | null;
  tagline: string | null;
};

export type Company = {
  id: string;
  name: string;
  website_url: string | null;
  default_dialect: Dialect;
  created_at: string;
  brand_profiles: BrandProfile | null;
  logo_url?: string | null;
};

export type Voice = {
  id: string;
  display_name: string;
  dialect: Dialect;
  gender: "female" | "male";
};

export const LAYOUTS = ["hero", "split", "list", "stat", "logo", "cta"] as const;
export type SceneLayout = (typeof LAYOUTS)[number];

export const MOTIONS = ["rise", "pop", "slide", "count"] as const;
export type SceneMotion = (typeof MOTIONS)[number];

export const COLOR_ROLES = ["primary", "ink", "accent", "background"] as const;
export type ColorRole = (typeof COLOR_ROLES)[number];

export type SceneVisual = { layout: SceneLayout; emphasis_color_role: ColorRole; motion: SceneMotion };

export type Scene = {
  id: string;
  title: string;
  duration_s: number;
  on_screen_text: string;
  /** null when the video has no voiceover. */
  voiceover_line: string | null;
  /** Missing on Phase 1 mock scenes. */
  visual?: SceneVisual;
};

export type Video = {
  id: string;
  workspace_id: string;
  company_id: string;
  title: string;
  brief: string;
  goal: Goal;
  format: VideoFormat;
  length_s: VideoLength;
  pace: Pace;
  dialect: Dialect;
  voiceover: boolean;
  voice_id: string | null;
  status: VideoStatus;
  created_at: string;
  music_enabled?: boolean;
  music_mood?: "energetic" | "warm" | "corporate" | "luxury" | null;
  music_track_id?: string | null;
};

export type LedgerRow = {
  id: string;
  kind: LedgerKind;
  amount_usd: number;
  amount_local: number | null;
  currency_code: string | null;
  fx_rate: number | null;
  note: string | null;
  created_at: string;
};
