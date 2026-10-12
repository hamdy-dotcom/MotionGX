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
  return [...new Set(errors)];
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

/** Full TypeScript typecheck of the composition against the real primitives/Remotion types. */
export function typecheck(code: string, root = process.cwd()): string[] {
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
  const diags = [...program.getSyntacticDiagnostics(sf), ...program.getSemanticDiagnostics(sf)];
  return diags.slice(0, 25).map((d) => {
    const pos = d.file && d.start !== undefined ? d.file.getLineAndCharacterOfPosition(d.start) : null;
    return `${pos ? `line ${pos.line + 1}: ` : ""}${ts.flattenDiagnosticMessageText(d.messageText, "\n")}`;
  });
}

/** Static checks → typecheck → esbuild to CommonJS (what the runtime evaluates). */
export async function compileComposition(code: string, root = process.cwd()): Promise<CompileResult> {
  const errors = staticCheck(code);
  if (errors.length) return { ok: false, errors };
  const typeErrors = typecheck(code, root);
  if (typeErrors.length) return { ok: false, errors: typeErrors };
  try {
    const out = await transform(code, { loader: "tsx", format: "cjs", jsx: "automatic", target: "es2020", sourcefile: FILE });
    return { ok: true, js: out.code, warnings: out.warnings.map((w) => w.text) };
  } catch (err) {
    return { ok: false, errors: [err instanceof Error ? err.message : String(err)] };
  }
}
