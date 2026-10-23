/**
 * @file Tests for `skills/planning/check-plan.sh`: it passes the bundled
 * example, reads the caps of the repo's `project.md`, and falls back to the
 * skill's own caps when the file or the type's row is missing.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, test } from "node:test";
import { fileURLToPath } from "node:url";

/** The planning skill in the repo. */
const SKILL = join(dirname(fileURLToPath(import.meta.url)), "..", "skills", "planning");

/** Copy of the skill for each test, where a `project.md` can be written. */
let skill;

/**
 * Runs the script of the copied skill on its `template.md`.
 *
 * @returns Exit code and combined output.
 */
function checkTemplate() {
  const result = spawnSync("bash", [join(skill, "check-plan.sh"), join(skill, "template.md")], { encoding: "utf8" });
  return { status: result.status, output: `${result.stdout}${result.stderr}` };
}

/**
 * Writes the `project.md` of the copied skill from its template, changing the
 * `feature` row.
 *
 * @param row - Replacement for the `feature` row, or `""` to drop it.
 */
function projectWithFeatureRow(row) {
  const template = readFileSync(join(skill, "project.md.template"), "utf8");
  writeFileSync(join(skill, "project.md"), template.replace("| feature | 120 | 10 | 200 |", row));
}

beforeEach(() => {
  skill = join(mkdtempSync(join(tmpdir(), "check-plan-")), "planning");
  cpSync(SKILL, skill, { recursive: true });
});

afterEach(() => {
  rmSync(dirname(skill), { recursive: true, force: true });
});

test("the bundled example passes with the skill's caps and no project.md", () => {
  const result = checkTemplate();

  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /OK: feature/);
});

test("a cap lowered in project.md is the one enforced", () => {
  projectWithFeatureRow("| feature | 50 | 10 | 200 |");

  const result = checkTemplate();

  assert.equal(result.status, 1);
  assert.match(result.output, /el tope de 'feature' es 50/);
});

test("the template's caps are the same as the script's own", () => {
  const script = readFileSync(join(SKILL, "check-plan.sh"), "utf8");
  const template = readFileSync(join(SKILL, "project.md.template"), "utf8");
  const own = {};
  for (const [, types, words, rows, lines] of script.matchAll(/^\s+([\w|]+)\) max_words=(\d+); max_rows=(\d+); max_lines=(\d+) ;;$/gm)) {
    for (const type of types.split("|")) {
      own[type] = [words, rows, lines].join(" ");
    }
  }

  const table = Object.fromEntries([...template.matchAll(/^\| (bug|feature|refactor) \| (\d+) \| (\d+) \| (\d+) \|$/gm)].map(([, type, ...caps]) => [type, caps.join(" ")]));

  assert.deepEqual(Object.keys(own).sort(), ["bug", "feature", "refactor"]);
  assert.deepEqual(table, own);
});

test("a type missing from the table, or with a non-numeric row, uses the skill's caps", () => {
  for (const row of ["", "| feature | muchas | 10 | 200 |", "|\tfeature\t|\t120\t|\t10\t|\t200\t|"]) {
    projectWithFeatureRow(row);

    const result = checkTemplate();

    assert.equal(result.status, 0, `${JSON.stringify(row)}\n${result.output}`);
  }
});

test("a cap written with a leading zero is still enforced, not skipped", () => {
  projectWithFeatureRow("| feature | 050 | 10 | 200 |");

  const result = checkTemplate();

  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /el tope de 'feature' es 50/);
});

test("a row for the type that cannot be read is reported, and the skill's caps apply", () => {
  for (const row of ["| feature | muchas | 10 | 200 |", "| feature | 99999999999999999999 | 10 | 200 |", "| `feature` | 120 | 10 |"]) {
    projectWithFeatureRow(row);

    const result = checkTemplate();

    assert.equal(result.status, 0, `${row}\n${result.output}`);
    assert.match(result.output, /fila de 'feature' en "## Topes" no se pudo leer/, row);
  }
});
