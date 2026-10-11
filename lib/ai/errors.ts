/** Error codes shown to the user via the `aiErrors.*` messages. Safe to import from client code. */
export const AI_ERROR_CODES = ["rate_limited", "not_configured", "ai_failed", "ai_invalid", "scrape_failed"] as const;
export type AiErrorCode = (typeof AI_ERROR_CODES)[number];
