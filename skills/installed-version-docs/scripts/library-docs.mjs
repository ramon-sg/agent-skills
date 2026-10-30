#!/usr/bin/env node
/**
 * @file Writes the installed version of each direct dependency, and where its
 * docs are, into a marked block of `AGENTS.md` (or `CLAUDE.md`). Only the block
 * is rewritten; the "Error típico" notes inside it are kept. With `--check` it
 * only says whether the block still matches the lock.
 *
 * Usage: node library-docs.mjs [--project-dir <dir>] [--check]
 * Exit codes: 0 ok, 1 block missing or stale (`--check`), 2 usage error.
 */
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";

const BEGIN = "<!-- BEGIN:installed-version-docs -->";
const END = "<!-- END:installed-version-docs -->";

/** Lock files, in the order they are looked for in each folder. */
const LOCKS = ["package-lock.json", "pnpm-lock.yaml", "yarn.lock", "bun.lock", "bun.lockb", "npm-shrinkwrap.json"];

/** Folders where a package may ship its own docs, in order. */
const DOC_DIRS = ["dist/docs", "docs", "doc"];

/** Size above which the block starts to crowd the agent's context. */
const MAX_BLOCK_BYTES = 8 * 1024;

/**
 * Parses the command line.
 *
 * @param argv - Arguments after the script.
 * @returns The project folder and whether to only check.
 */
function parseArgs(argv) {
  const options = { projectDir: process.cwd(), check: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--check") {
      options.check = true;
    } else if (argv[i] === "--project-dir" && argv[i + 1]) {
      options.projectDir = resolve(argv[++i]);
    } else {
      fail(`argumento desconocido: ${argv[i]}\nuso: node library-docs.mjs [--project-dir <carpeta>] [--check]`);
    }
  }
  return options;
}

/**
 * Prints an error and exits with code 2.
 *
 * @param message - What went wrong.
 */
function fail(message) {
  process.stderr.write(`error: ${message}\n`);
  process.exit(2);
}

/**
 * Reads a JSON file, or returns `undefined` if it is missing or broken.
 *
 * @param path - File to read.
 * @returns Its parsed content.
 */
function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return undefined;
  }
}

/**
 * Tells whether a path is a folder.
 *
 * @param path - Path to test.
 * @returns `true` for an existing folder.
 */
function isDir(path) {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Lists the folders from `start` up to the filesystem root.
 *
 * @param start - First folder.
 * @returns The folders, nearest first.
 */
function ancestors(start) {
  const dirs = [start];
  while (dirname(dirs.at(-1)) !== dirs.at(-1)) {
    dirs.push(dirname(dirs.at(-1)));
  }
  return dirs;
}

/**
 * Finds the nearest lock file, as a monorepo keeps it at the root.
 *
 * @param projectDir - Project folder.
 * @returns Path of the lock, or `undefined`.
 */
function findLock(projectDir) {
  for (const dir of ancestors(projectDir)) {
    const lock = LOCKS.map((name) => join(dir, name)).find((path) => existsSync(path));
    if (lock) {
      return lock;
    }
  }
  return undefined;
}

/**
 * Finds the installed folder of a package, walking up like Node does.
 *
 * @param projectDir - Project folder.
 * @param name - Package name.
 * @returns The folder, or `undefined` if it is not installed.
 */
function findPackage(projectDir, name) {
  return ancestors(projectDir)
    .map((dir) => join(dir, "node_modules", name))
    .find((dir) => existsSync(join(dir, "package.json")));
}

/**
 * Fingerprint of what the block depends on: the lock and the declared
 * dependencies.
 *
 * @param lock - Lock file, if any.
 * @param dependencies - Name and range of each direct dependency.
 * @returns The first 12 hex characters of a SHA-256.
 */
function fingerprint(lock, dependencies) {
  const hash = createHash("sha256");
  hash.update(JSON.stringify(dependencies));
  if (lock) {
    hash.update(readFileSync(lock));
  }
  return hash.digest("hex").slice(0, 12);
}

/**
 * Finds the first `types` entry of an `exports` map.
 *
 * @param exports - The `exports` field, or one of its branches.
 * @returns The path, or `undefined`.
 */
function exportsTypes(exports) {
  if (!exports || typeof exports !== "object") {
    return undefined;
  }
  if (typeof exports.types === "string") {
    return exports.types;
  }
  const branches = "." in exports ? [exports["."]] : Object.values(exports);
  for (const branch of branches) {
    const found = exportsTypes(branch);
    if (found) {
      return found;
    }
  }
  return undefined;
}

/**
 * Removes a leading `./` from a path inside a package.
 *
 * @param path - Path as written in a `package.json`.
 * @returns The plain path.
 */
function plain(path) {
  return path.replace(/^\.\//, "");
}

/**
 * Turns a `homepage` into a short site name.
 *
 * @param homepage - The `homepage` field.
 * @returns The site without protocol, `#readme` or trailing slash.
 */
function site(homepage) {
  return homepage
    .replace(/^https?:\/\//, "")
    .replace(/#.*$/, "")
    .replace(/\/$/, "");
}

/**
 * Lists the docs of an installed package, author's own first.
 *
 * @param dir - Package folder.
 * @param manifest - Its `package.json`.
 * @param typesPackage - Installed `@types` package for it, if any.
 * @returns Entries such as `types: index.d.ts`.
 */
function docsOf(dir, manifest, typesPackage) {
  const entries = [];
  const files = readdirSync(dir);

  if (isDir(join(dir, "skills"))) {
    entries.push("skill: skills/");
  }
  const docsDir = DOC_DIRS.find((path) => isDir(join(dir, path)));
  if (docsDir) {
    entries.push(`docs: ${docsDir}/`);
  }
  const llms = ["llms.txt", "llms-full.txt"].find((name) => files.includes(name));
  if (llms) {
    entries.push(`llms: ${llms}`);
  }

  const types = manifest.types ?? manifest.typings ?? exportsTypes(manifest.exports) ?? (files.includes("index.d.ts") ? "index.d.ts" : undefined);
  if (types) {
    entries.push(`types: ${plain(types)}`);
  } else if (typesPackage) {
    entries.push(`types: ${typesPackage}`);
  }

  const readme = files.find((name) => /^readme(\.md|\.markdown|\.txt)?$/i.test(name));
  if (readme) {
    entries.push(readme);
  }
  const changelog = files.find((name) => /^(changelog|history|changes)(\.md|\.markdown|\.txt)?$/i.test(name));
  if (changelog) {
    entries.push(changelog);
  }
  if (typeof manifest.homepage === "string" && manifest.homepage) {
    entries.push(`web: ${site(manifest.homepage)}`);
  }
  return entries;
}

/**
 * Name of the `@types` package that describes a library.
 *
 * @param name - Library name.
 * @returns For example `@types/node`, or `@types/scope__pkg` for a scoped one.
 */
function typesPackageName(name) {
  return `@types/${name.replace(/^@/, "").replace("/", "__")}`;
}

/**
 * Escapes a value for a Markdown table cell.
 *
 * @param text - Cell text.
 * @returns The text with `|` escaped.
 */
function cell(text) {
  return text.replace(/(?<!\\)\|/g, "\\|");
}

/**
 * Splits a Markdown table row into its trimmed cells, honoring `\|`.
 *
 * @param line - Row text.
 * @returns The cells, without the empty ones at both ends.
 */
function cells(line) {
  return line
    .split(/(?<!\\)\|/)
    .slice(1, -1)
    .map((value) => value.trim());
}

/**
 * Reads the hand-written notes of an existing block.
 *
 * @param block - The current block.
 * @returns Note by library name.
 */
function notesOf(block) {
  const notes = new Map();
  for (const line of block.split("\n")) {
    const row = cells(line);
    // A `|` left unescaped in the note splits it into more cells; join them back.
    const note = row.slice(3).join(" \\| ");
    if (row.length >= 4 && note && row[0] !== "Biblioteca" && !/^-+$/.test(row[0])) {
      notes.set(row[0], note);
    }
  }
  return notes;
}

/**
 * Finds the block inside a file's text.
 *
 * @param text - File content.
 * @returns Start and end offsets, or `undefined`.
 */
function findBlock(text) {
  const start = text.indexOf(BEGIN);
  const end = text.indexOf(END, start);
  return start === -1 || end === -1 ? undefined : { start, end: end + END.length };
}

/**
 * Picks the agent file: `AGENTS.md`, or `CLAUDE.md` if it is the only one.
 *
 * @param projectDir - Project folder.
 * @returns Its path.
 */
function agentFile(projectDir) {
  const agents = join(projectDir, "AGENTS.md");
  const claude = join(projectDir, "CLAUDE.md");
  return !existsSync(agents) && existsSync(claude) ? claude : agents;
}

/**
 * Builds the block.
 *
 * @param rows - Table rows, already formatted.
 * @param hash - Fingerprint of the lock.
 * @returns The block, markers included.
 */
function renderBlock(rows, hash) {
  return [
    BEGIN,
    `<!-- lock: ${hash} · lo genera la skill installed-version-docs; solo la columna "Error típico" se edita a mano -->`,
    "",
    "## Versiones instaladas",
    "",
    "Estas versiones pueden no ser las que recuerdas: más nuevas o más viejas, con otra API. Antes de escribir código con una de estas bibliotecas, lee su documentación en el orden de la columna y di qué versión usas. Lo del autor (`skill:`, `docs:`, `llms:`) manda. Si la API no aparece en esas fuentes, dilo: no adivines.",
    "",
    "Las rutas son relativas a `node_modules/<biblioteca>/`, o a la carpeta de `en:` si aparece. En `web:` busca `llms.txt` o la documentación de esa versión.",
    "",
    "| Biblioteca | Versión | Documentación | Error típico |",
    "|---|---|---|---|",
    ...rows,
    END,
  ].join("\n");
}

/**
 * Main entry point.
 */
function main() {
  const { projectDir, check } = parseArgs(process.argv.slice(2));
  const manifest = readJson(join(projectDir, "package.json"));
  if (!manifest) {
    fail(`no hay package.json en ${projectDir}`);
  }

  const declared = { ...manifest.devDependencies, ...manifest.dependencies };
  const dependencies = Object.keys(declared)
    .sort()
    .map((name) => [name, declared[name]]);
  const lock = findLock(projectDir);
  const hash = fingerprint(lock, dependencies);
  const file = agentFile(projectDir);
  const current = existsSync(file) ? readFileSync(file, "utf8") : "";
  const found = findBlock(current);
  const name = relative(projectDir, file);

  if (check) {
    if (!found) {
      process.stderr.write(`${name} no tiene el bloque de versiones: corre el script sin --check\n`);
      process.exit(1);
    }
    if (!current.slice(found.start, found.end).includes(`lock: ${hash} `)) {
      process.stderr.write(`el lock cambió desde que se generó el bloque de ${name}: corre el script sin --check\n`);
      process.exit(1);
    }
    process.stdout.write(`${name}: el bloque de versiones está al día (lock ${hash})\n`);
    return;
  }

  const notes = found ? notesOf(current.slice(found.start, found.end)) : new Map();
  const lockPackages = lock?.endsWith(".json") ? (readJson(lock)?.packages ?? {}) : {};
  const missing = [];
  const rows = [];

  for (const [library, range] of dependencies) {
    if (library.startsWith("@types/")) {
      continue;
    }
    const dir = findPackage(projectDir, library);
    let version;
    let docs;
    if (dir) {
      const installed = readJson(join(dir, "package.json")) ?? {};
      const typesPackage = typesPackageName(library) in declared ? typesPackageName(library) : undefined;
      version = installed.version ?? range;
      docs = docsOf(dir, installed, typesPackage);
      const expected = join(projectDir, "node_modules", library);
      if (dir !== expected) {
        docs.unshift(`en: ${relative(projectDir, dir).split(sep).join("/")}/`);
      }
    } else {
      missing.push(library);
      version = `${lockPackages[`node_modules/${library}`]?.version ?? range} (sin instalar)`;
      docs = [];
    }
    rows.push(`| ${library} | ${cell(version)} | ${cell(docs.join(" · ") || "—")} | ${notes.get(library) ?? ""} |`.replace(/ {2}\|$/, " |"));
  }

  const block = renderBlock(rows, hash);
  let next;
  if (found) {
    next = `${current.slice(0, found.start)}${block}${current.slice(found.end)}`;
  } else if (current.trim()) {
    next = `${current.trimEnd()}\n\n${block}\n`;
  } else {
    next = `${block}\n`;
  }
  if (next !== current) {
    writeFileSync(file, next);
  }

  process.stdout.write(`${name}: ${rows.length} bibliotecas (lock ${hash})\n`);
  if (missing.length) {
    process.stderr.write(`aviso: sin instalar: ${missing.join(", ")}. Instala las dependencias y vuelve a correr el script.\n`);
  }
  if (Buffer.byteLength(block) > MAX_BLOCK_BYTES) {
    process.stderr.write(`aviso: el bloque pesa ${Buffer.byteLength(block)} bytes, más de ${MAX_BLOCK_BYTES}: llena el contexto del agente.\n`);
  }
  const claude = join(projectDir, "CLAUDE.md");
  if (file.endsWith("AGENTS.md") && existsSync(claude) && !readFileSync(claude, "utf8").includes("@AGENTS.md")) {
    process.stderr.write("aviso: CLAUDE.md no importa AGENTS.md. Agrega la línea `@AGENTS.md` para que Claude Code lea el bloque.\n");
  }
}

main();
