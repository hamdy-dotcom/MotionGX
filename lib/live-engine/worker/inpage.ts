// Installs the in-page functions (inpage.js, verbatim from the sandbox) into every page of a browser
// context and calls them by name. Plain JS text on purpose: see the header of inpage.js.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { BrowserContext, Frame, Page } from "playwright";

const here = path.dirname(fileURLToPath(import.meta.url));
export const INPAGE = fs.readFileSync(path.join(here, "inpage.js"), "utf8");

export type InPageFn = "PROBE" | "MARK" | "REGIONS" | "OBJECTS" | "SNAPSHOT" | "QA_PROBE";

export const installInPage = (ctx: BrowserContext) => ctx.addInitScript({ content: INPAGE });

/** page.evaluate(FN, arg) of the sandbox, with FN taken from inpage.js */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const call = <T = any>(page: Page | Frame, fn: InPageFn, arg?: unknown): Promise<T> => page.evaluate(`window.__mgx.${fn}(${arg === undefined ? "" : JSON.stringify(arg)})`) as Promise<T>;
