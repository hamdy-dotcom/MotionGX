// Static checks for generated illustrations (Node only — keeps `typescript` out of the render bundle).
import ts from "typescript";

export const MAX_ILLUSTRATION_LINES = 150;
const BANNED_CALLS = new Set(["setTimeout", "setInterval", "requestAnimationFrame", "Date", "performance"]);
const HEX = /#[0-9a-fA-F]{3,8}\b/;
const RAW_COLOR = /\b(rgba?|hsla?|oklch)\s*\(/;
const NAMED_COLOR = /^(red|green|blue|black|white|gray|grey|orange|yellow|purple|pink|brown|cyan|magenta)$/i;

/**
 * AST checks for an illustration: only `react` may be imported, no hooks / timers / clocks / randomness,
 * no colour literals (roles only), no <text>, ≤ 150 lines, a default export. Pure analysis, nothing runs.
 */
export function illustrationStaticCheck(code: string): string[] {
  const errors: string[] = [];
  const lines = code.split("\n").length;
  if (lines > MAX_ILLUSTRATION_LINES) errors.push(`${lines} lines (max ${MAX_ILLUSTRATION_LINES}) — simplify the drawing`);
  const sf = ts.createSourceFile("illustration.tsx", code, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TSX);
  const line = (n: ts.Node) => sf.getLineAndCharacterOfPosition(n.getStart()).line + 1;
  let hasDefault = false;
  const visit = (n: ts.Node) => {
    if (ts.isImportDeclaration(n) && ts.isStringLiteral(n.moduleSpecifier) && n.moduleSpecifier.text !== "react") errors.push(`line ${line(n)}: import "${n.moduleSpecifier.text}" is not allowed (react only)`);
    if (ts.isExportAssignment(n)) hasDefault = true;
    if ((ts.isFunctionDeclaration(n) || ts.isClassDeclaration(n)) && n.modifiers?.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword)) hasDefault = true;
    if (ts.isCallExpression(n) && n.expression.kind === ts.SyntaxKind.ImportKeyword) errors.push(`line ${line(n)}: dynamic import() is not allowed`);
    if (ts.isCallExpression(n) || ts.isNewExpression(n)) {
      const e = n.expression;
      const name = ts.isIdentifier(e) ? e.text : ts.isPropertyAccessExpression(e) ? e.name.text : "";
      const obj = ts.isPropertyAccessExpression(e) && ts.isIdentifier(e.expression) ? e.expression.text : "";
      if (/^use[A-Z]/.test(name)) errors.push(`line ${line(n)}: ${name}() — no hooks; motion comes only from the p props`);
      if (BANNED_CALLS.has(name) || BANNED_CALLS.has(obj)) errors.push(`line ${line(n)}: ${obj ? `${obj}.` : ""}${name} is not allowed — the drawing must be a pure function of its props`);
      if (obj === "Math" && name === "random") errors.push(`line ${line(n)}: Math.random is not allowed — use fixed values`);
    }
    if (ts.isIdentifier(n) && ["eval", "Function", "fetch", "window", "document", "globalThis", "process", "require"].includes(n.text)) {
      const p = n.parent;
      if (!(ts.isPropertyAccessExpression(p) && p.name === n) && !(ts.isPropertyAssignment(p) && p.name === n)) errors.push(`line ${line(n)}: "${n.text}" is not allowed`);
    }
    if ((ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) || ts.isTemplateHead(n) || ts.isTemplateMiddle(n) || ts.isTemplateTail(n)) && (HEX.test(n.text) || RAW_COLOR.test(n.text) || NAMED_COLOR.test(n.text.trim())) && !/^url\(#/.test(n.text)) {
      errors.push(`line ${line(n)}: colour literal "${n.text.slice(0, 30)}" — use colour roles (c.primary, c.accent, …)`);
    }
    if ((ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n)) && ts.isIdentifier(n.tagName)) {
      const tag = n.tagName.text;
      if (tag === "text" || tag === "tspan" || tag === "textPath") errors.push(`line ${line(n)}: no <${tag}> — labels belong in the spec, not the drawing`);
      if (tag === "image" || tag === "foreignObject" || tag === "script") errors.push(`line ${line(n)}: <${tag}> is not allowed (pure SVG shapes only)`);
    }
    if (ts.isJsxText(n) && n.text.trim()) errors.push(`line ${line(n)}: text content "${n.text.trim().slice(0, 20)}" — no text inside the drawing`);
    ts.forEachChild(n, visit);
  };
  visit(sf);
  if (!hasDefault) errors.push("the file must `export default` the component");
  return [...new Set(errors)].slice(0, 20);
}
