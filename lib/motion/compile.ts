// Static checks + typecheck + transpile for a generated composition.
// Pure analysis — nothing here executes the generated code. Called from the isolated runner.
import path from "node:path";
import ts from "typescript";
import { transform } from "esbuild";
import { ALLOWED_IMPORTS, FORBIDDEN_GLOBALS } from "./allowed";

export type CompileResult = { ok: true; js: string; warnings: string[] } | { ok: false; errors: string[] };

const FILE = "composition.tsx";

/** AST checks: allowed imports only, no forbidden globals, no dynamic import, a default export. */
export function staticCheck(code: string): string[] {
  const sf = ts.createSourceFile(FILE, code, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TSX);
  const errors: string[] = [];
  const allowed = new Set<string>(ALLOWED_IMPORTS);
  const forbidden = new Set<string>(FORBIDDEN_GLOBALS);
  let hasDefault = false;
  const declared = new Set<string>();

  const line = (n: ts.Node) => sf.getLineAndCharacterOfPosition(n.getStart()).line + 1;

  // names the file declares itself (so a local `top`/`self` variable is fine)
  const collect = (n: ts.Node) => {
    if ((ts.isVariableDeclaration(n) || ts.isFunctionDeclaration(n) || ts.isParameter(n) || ts.isBindingElement(n)) && n.name && ts.isIdentifier(n.name)) declared.add(n.name.text);
    if (ts.isImportSpecifier(n) || ts.isNamespaceImport(n) || ts.isImportClause(n)) {
      const name = (n as ts.ImportSpecifier).name;
      if (name && ts.isIdentifier(name)) declared.add(name.text);
    }
    ts.forEachChild(n, collect);
  };
  collect(sf);

  const visit = (n: ts.Node) => {
    if (ts.isImportDeclaration(n) && ts.isStringLiteral(n.moduleSpecifier)) {
      if (!allowed.has(n.moduleSpecifier.text)) errors.push(`line ${line(n)}: import "${n.moduleSpecifier.text}" is not allowed (only ${[...allowed].join(", ")})`);
    }
    if (ts.isExportDeclaration(n) && n.moduleSpecifier) errors.push(`line ${line(n)}: re-exports are not allowed`);
    if (ts.isCallExpression(n) && n.expression.kind === ts.SyntaxKind.ImportKeyword) errors.push(`line ${line(n)}: dynamic import() is not allowed`);
    if (ts.isExportAssignment(n)) hasDefault = true;
    if ((ts.isFunctionDeclaration(n) || ts.isClassDeclaration(n)) && n.modifiers?.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword)) hasDefault = true;
    if (ts.isIdentifier(n) && forbidden.has(n.text) && !declared.has(n.text)) {
      const p = n.parent;
      const isPropertyName = (ts.isPropertyAccessExpression(p) && p.name === n) || (ts.isPropertyAssignment(p) && p.name === n) || ts.isJsxAttribute(p) || (ts.isMethodDeclaration(p) && p.name === n);
      if (!isPropertyName) errors.push(`line ${line(n)}: "${n.text}" is not allowed in a composition`);
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  if (!hasDefault) errors.push("the file must `export default` the composition component");
  errors.push(...hooksCheck(sf));
  return [...new Set(errors)];
}

const isHookName = (name: string) => /^use[A-Z0-9]/.test(name);
const isComponentName = (name: string) => /^[A-Z]/.test(name);

/** Name a function is known by: `function Foo`, `const Foo = () =>`, `const Foo = React.memo(() =>)`. */
function functionName(fn: ts.SignatureDeclaration): string | null {
  if ((ts.isFunctionDeclaration(fn) || ts.isFunctionExpression(fn)) && fn.name) return fn.name.text;
  let p: ts.Node = fn.parent;
  while (p && (ts.isCallExpression(p) || ts.isParenthesizedExpression(p) || ts.isAsExpression(p))) p = p.parent;
  if (p && ts.isVariableDeclaration(p) && ts.isIdentifier(p.name)) return p.name.text;
  if (p && ts.isExportAssignment(p)) return "Default";
  return null;
}

/**
 * Rules of hooks (what made React throw #310 at render time): a hook call must sit directly in a
 * component or custom hook body — not in a loop, a condition, a nested callback, or after an early return.
 */
function hooksCheck(sf: ts.SourceFile): string[] {
  const errors: string[] = [];
  const line = (n: ts.Node) => sf.getLineAndCharacterOfPosition(n.getStart()).line + 1;
  const visit = (n: ts.Node) => {
    if (ts.isCallExpression(n)) {
      const callee = n.expression;
      const name = ts.isIdentifier(callee) ? callee.text : ts.isPropertyAccessExpression(callee) ? callee.name.text : null;
      if (name && isHookName(name)) {
        let p: ts.Node = n.parent;
        let problem: string | null = null;
        while (p && !ts.isFunctionLike(p)) {
          if (ts.isIfStatement(p) || ts.isConditionalExpression(p) || ts.isSwitchStatement(p)) problem = "inside a condition";
          else if (ts.isForStatement(p) || ts.isForOfStatement(p) || ts.isForInStatement(p) || ts.isWhileStatement(p) || ts.isDoStatement(p)) problem = "inside a loop";
          else if (ts.isBinaryExpression(p) && [ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken].includes(p.operatorToken.kind)) problem = "inside a conditional expression";
          p = p.parent;
        }
        if (!problem && p) {
          const fnName = functionName(p as ts.SignatureDeclaration);
          if (!fnName || !(isComponentName(fnName) || isHookName(fnName))) problem = "inside a callback or a function that is not a component";
          else {
            // an early `return` before this call in the same body
            const body = (p as ts.FunctionLikeDeclaration).body;
            if (body && ts.isBlock(body)) {
              const stmt = body.statements.find((st) => st.pos <= n.pos && n.end <= st.end);
              const earlier = body.statements.slice(0, stmt ? body.statements.indexOf(stmt) : 0);
              const returns = (x: ts.Node): boolean => ts.isReturnStatement(x) || (!ts.isFunctionLike(x) && (ts.forEachChild(x, returns) ?? false));
              if (earlier.some(returns)) problem = "after an early return";
            }
          }
        }
        if (problem) errors.push(`line ${line(n)}: ${name}() is called ${problem} — React requires hooks at the top level of a component (move per-item motion into a child component)`);
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return errors;
}

let cachedOptions: ts.CompilerOptions | null = null;
/** The project's own tsconfig (the same options the app compiles with) + the primitives alias. */
function compilerOptions(root: string): ts.CompilerOptions {
  if (cachedOptions) return cachedOptions;
  const configPath = path.join(root, "tsconfig.json");
  const { config } = ts.readConfigFile(configPath, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(config ?? {}, ts.sys, root);
  cachedOptions = {
    ...parsed.options,
    noEmit: true,
    incremental: false,
    noImplicitAny: false,
    // No baseUrl: it would resolve the bare name "remotion" to this repo's remotion/ folder.
    baseUrl: undefined,
    paths: { ...(parsed.options.paths ?? {}), "@motiongx/primitives": [path.join(root, "packages/primitives/src/index.ts")] },
    plugins: [],
  };
  return cachedOptions;
}

// Type errors that mean the code calls something that doesn't exist (wrong API, missing import,
// wrong arity) block the round. Strictness complaints (possibly-null, number vs string, …) don't
// change what renders, so they're passed back to the coder as warnings instead of costing a round.
const BLOCKING_TS_CODES = new Set([2304, 2305, 2307, 2339, 2349, 2351, 2551, 2552, 2554, 2555, 2556, 2613, 2614, 2724]);

/** Full TypeScript typecheck of the composition against the real primitives/Remotion types. */
export function typecheck(code: string, root = process.cwd()): { blocking: string[]; warnings: string[] } {
  const options = compilerOptions(root);
  const file = path.join(root, ".motion-check", FILE);
  const host = ts.createCompilerHost(options, true);
  const getSourceFile = host.getSourceFile.bind(host);
  host.getSourceFile = (name, lang, onError, create) => (name === file ? ts.createSourceFile(name, code, lang, true, ts.ScriptKind.TSX) : getSourceFile(name, lang, onError, create));
  const fileExists = host.fileExists.bind(host);
  host.fileExists = (name) => name === file || fileExists(name);
  const readFile = host.readFile.bind(host);
  host.readFile = (name) => (name === file ? code : readFile(name));
  const program = ts.createProgram([file], options, host);
  const sf = program.getSourceFile(file)!;
  const fmt = (d: ts.Diagnostic) => {
    const pos = d.file && d.start !== undefined ? d.file.getLineAndCharacterOfPosition(d.start) : null;
    return `${pos ? `line ${pos.line + 1}: ` : ""}${ts.flattenDiagnosticMessageText(d.messageText, "\n")}`;
  };
  const syntactic = program.getSyntacticDiagnostics(sf);
  const semantic = program.getSemanticDiagnostics(sf);
  return {
    blocking: [...syntactic, ...semantic.filter((d) => BLOCKING_TS_CODES.has(d.code))].slice(0, 25).map(fmt),
    warnings: semantic.filter((d) => !BLOCKING_TS_CODES.has(d.code)).slice(0, 25).map(fmt),
  };
}

/** Static checks → typecheck → esbuild to CommonJS (what the runtime evaluates). */
export async function compileComposition(code: string, root = process.cwd()): Promise<CompileResult> {
  const errors = staticCheck(code);
  if (errors.length) return { ok: false, errors };
  const types = typecheck(code, root);
  if (types.blocking.length) return { ok: false, errors: types.blocking };
  try {
    const out = await transform(code, { loader: "tsx", format: "cjs", jsx: "automatic", target: "es2020", sourcefile: FILE });
    return { ok: true, js: out.code, warnings: [...types.warnings, ...out.warnings.map((w) => w.text)] };
  } catch (err) {
    return { ok: false, errors: [err instanceof Error ? err.message : String(err)] };
  }
}
