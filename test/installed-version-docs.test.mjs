/**
 * @file Tests for `skills/installed-version-docs/scripts/library-docs.mjs`:
 * it writes a marked block with the installed versions into `AGENTS.md` (or
 * `CLAUDE.md`), points each library at its own docs first, keeps everything
 * outside the block and the hand-written notes, and `--check` tells whether
 * the block still matches the lock.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, test } from "node:test";
import { fileURLToPath } from "node:url";

/** The script under test. */
const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), "..", "skills", "installed-version-docs", "scripts", "library-docs.mjs");

/** Temporary project for each test. */
let project;

/**
 * Runs the script on the project.
 *
 * @param args - Extra arguments.
 * @returns Exit code and combined output.
 */
function libraryDocs(...args) {
  const result = spawnSync(process.execPath, [SCRIPT, "--project-dir", project, ...args], { encoding: "utf8" });
  return { status: result.status, output: `${result.stdout}${result.stderr}` };
}

/**
 * Writes a file inside the project, creating its folders.
 *
 * @param path - Path relative to the project.
 * @param content - Text, or an object written as JSON.
 */
function write(path, content) {
  const full = join(project, path);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, typeof content === "string" ? content : JSON.stringify(content, null, 2));
}

/**
 * Reads a file of the project.
 *
 * @param path - Path relative to the project.
 * @returns Its text.
 */
function read(path) {
  return readFileSync(join(project, path), "utf8");
}

/**
 * Installs a fake package in `node_modules`.
 *
 * @param name - Package name.
 * @param manifest - Fields of its `package.json` besides the name.
 * @param files - Extra files, relative to the package folder.
 */
function install(name, manifest, files = []) {
  write(`node_modules/${name}/package.json`, { name, ...manifest });
  for (const file of files) {
    write(`node_modules/${name}/${file}`, "x");
  }
}

/**
 * Finds the table row of a library in the generated block.
 *
 * @param text - Content of the agent file.
 * @param name - Library name.
 * @returns The row.
 */
function row(text, name) {
  const found = text.split("\n").find((line) => line.startsWith(`| ${name} |`));
  assert.ok(found, `no row for ${name} in:\n${text}`);
  return found;
}

beforeEach(() => {
  project = mkdtempSync(join(tmpdir(), "library-docs-"));
  write("package.json", {
    name: "app",
    dependencies: { zod: "^4.0.0", "drizzle-orm": "^0.44.0", next: "^16.2.0" },
    devDependencies: { "@types/node": "^24.0.0", vitest: "^3.0.0" },
  });
  write("package-lock.json", { lockfileVersion: 3, packages: {} });
  install("zod", { version: "4.1.5", types: "./index.d.ts", homepage: "https://zod.dev" }, ["README.md", "CHANGELOG.md"]);
  install("drizzle-orm", { version: "0.44.2", exports: { ".": { import: { types: "./index.d.mts", default: "./index.mjs" } } } }, ["README.md"]);
  install("next", { version: "16.2.1", homepage: "https://nextjs.org" }, ["dist/docs/index.mdx", "README.md"]);
  install("vitest", { version: "3.2.0" }, ["skills/vitest/SKILL.md", "llms.txt"]);
  install("@types/node", { version: "24.0.1" });
});

afterEach(() => {
  rmSync(project, { recursive: true, force: true });
});

test("writes a marked block in a new AGENTS.md with the installed versions", () => {
  const result = libraryDocs();

  assert.equal(result.status, 0, result.output);
  const text = read("AGENTS.md");
  assert.match(text, /<!-- BEGIN:installed-version-docs -->[\s\S]*<!-- END:installed-version-docs -->/);
  assert.match(row(text, "zod"), /\| 4\.1\.5 \|/);
  assert.match(row(text, "drizzle-orm"), /\| 0\.44\.2 \|/);
  assert.match(row(text, "next"), /\| 16\.2\.1 \|/);
});

test("lists the author's own skills and docs first, then types, README, CHANGELOG and web", () => {
  libraryDocs();
  const text = read("AGENTS.md");

  assert.match(row(text, "vitest"), /skill: skills\/ · llms: llms\.txt/);
  assert.match(row(text, "next"), /docs: dist\/docs\/ · README\.md · web: nextjs\.org/);
  assert.match(row(text, "zod"), /types: index\.d\.ts · README\.md · CHANGELOG\.md · web: zod\.dev/);
  assert.match(row(text, "drizzle-orm"), /types: index\.d\.mts · README\.md/);
});

test("leaves out @types packages, which only describe another library", () => {
  libraryDocs();

  assert.doesNotMatch(read("AGENTS.md"), /@types\/node/);
});

test("marks a dependency that is not installed instead of guessing its version", () => {
  rmSync(join(project, "node_modules", "zod"), { recursive: true });

  const result = libraryDocs();

  assert.equal(result.status, 0, result.output);
  assert.match(row(read("AGENTS.md"), "zod"), /\| \^4\.0\.0 \(sin instalar\) \|/);
  assert.match(result.output, /sin instalar: zod/);
});

test("keeps everything outside the block and the hand-written notes", () => {
  write("AGENTS.md", "# Reglas\n\nUsa pnpm.\n");
  libraryDocs();
  const withNote = read("AGENTS.md").replace(/(\| zod \| .*\| )(\|)$/m, "$1usa `z.email()`, no `z.string().email()` \\| ver v4 $2");
  writeFileSync(join(project, "AGENTS.md"), `${withNote}\n## Al final\n\nNo tocar.\n`);
  install("zod", { version: "4.2.0", types: "./index.d.ts", homepage: "https://zod.dev" }, ["README.md", "CHANGELOG.md"]);
  write("package-lock.json", { lockfileVersion: 3, packages: { "node_modules/zod": { version: "4.2.0" } } });

  libraryDocs();

  const text = read("AGENTS.md");
  assert.match(text, /^# Reglas\n\nUsa pnpm\.\n/);
  assert.match(text, /## Al final\n\nNo tocar\.\n$/);
  assert.match(row(text, "zod"), /\| 4\.2\.0 \| .* \| usa `z\.email\(\)`, no `z\.string\(\)\.email\(\)` \\\| ver v4 \|$/);
});

test("a note written with an unescaped pipe is kept, with the pipe escaped", () => {
  libraryDocs();
  writeFileSync(join(project, "AGENTS.md"), read("AGENTS.md").replace(/(\| zod \| .*\| )(\|)$/m, "$1a | b $2"));

  libraryDocs();

  assert.match(row(read("AGENTS.md"), "zod"), /\| a \\\| b \|$/);
});

test("running it twice changes nothing", () => {
  libraryDocs();
  const first = read("AGENTS.md");

  libraryDocs();

  assert.equal(read("AGENTS.md"), first);
});

test("writes into CLAUDE.md when the project has it and no AGENTS.md", () => {
  write("CLAUDE.md", "# Claude\n");

  libraryDocs();

  assert.ok(!existsSync(join(project, "AGENTS.md")));
  assert.match(read("CLAUDE.md"), /^# Claude\n[\s\S]*BEGIN:installed-version-docs/);
});

test("warns when CLAUDE.md exists but does not import AGENTS.md", () => {
  write("AGENTS.md", "# Agentes\n");
  write("CLAUDE.md", "# Claude\n");

  const result = libraryDocs();

  assert.match(result.output, /CLAUDE\.md no importa AGENTS\.md/);
});

test("--check passes on a fresh block and fails once the lock changes or the block is missing", () => {
  assert.equal(libraryDocs("--check").status, 1);

  libraryDocs();
  assert.equal(libraryDocs("--check").status, 0);

  write("package-lock.json", { lockfileVersion: 3, packages: { "node_modules/zod": { version: "4.2.0" } } });
  const stale = libraryDocs("--check");
  assert.equal(stale.status, 1);
  assert.match(stale.output, /el lock cambió/);
});

test("--check does not write anything", () => {
  libraryDocs("--check");

  assert.ok(!existsSync(join(project, "AGENTS.md")));
});

test("fails with a clear message when there is no package.json", () => {
  rmSync(join(project, "package.json"));

  const result = libraryDocs();

  assert.equal(result.status, 2);
  assert.match(result.output, /no hay package\.json/);
});

test("finds packages hoisted to a parent node_modules, as in a monorepo", () => {
  const app = join(project, "apps", "web");
  mkdirSync(app, { recursive: true });
  writeFileSync(join(app, "package.json"), JSON.stringify({ dependencies: { zod: "^4.0.0" } }));

  const result = spawnSync(process.execPath, [SCRIPT, "--project-dir", app], { encoding: "utf8" });

  assert.equal(result.status, 0, result.stderr);
  assert.match(row(readFileSync(join(app, "AGENTS.md"), "utf8"), "zod"), /\| 4\.1\.5 \| en: \.\.\/\.\.\/node_modules\/zod\/ · types: index\.d\.ts/);
});
