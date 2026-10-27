/**
 * @file Tests for the `visual-preview` server, started and stopped with its
 * own scripts: the key gates every request, a fragment comes back inside the
 * frame and a full document as-is, a click reaches the events file, the
 * project folder ignores itself in git, and stopping keeps the screens.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";

/** Scripts of the skill in the repo. */
const SCRIPTS = join(dirname(fileURLToPath(import.meta.url)), "..", "skills", "visual-preview", "scripts");

/** Project the server keeps its screens in. */
let project;

/** JSON the start script printed. */
let info;

/** Cookie the server set after the keyed first load. */
let cookie;

/**
 * Runs one of the skill's scripts.
 *
 * @param name - Script file name.
 * @param args - Its arguments.
 * @returns Its stdout, parsed as JSON.
 */
function script(name, args) {
  const result = spawnSync("bash", [join(SCRIPTS, name), ...args], { encoding: "utf8" });
  assert.equal(result.status, 0, `${name}\n${result.stdout}${result.stderr}`);
  return JSON.parse(result.stdout.trim().split("\n").at(-1));
}

/**
 * Requests a path of the server.
 *
 * @param path - Path, with its query.
 * @param headers - Extra request headers.
 * @returns The response.
 */
function get(path, headers = {}) {
  return fetch(`http://localhost:${info.port}${path}`, { headers });
}

/**
 * Writes a screen and waits until the server serves it.
 *
 * @param name - File name in the screen folder.
 * @param html - Its content.
 * @param marker - Text that shows it is the one being served.
 * @returns The served page.
 */
async function push(name, html, marker) {
  writeFileSync(join(info.screen_dir, name), html);
  for (let attempt = 0; attempt < 50; attempt++) {
    const page = await (await get("/", { cookie })).text();
    if (page.includes(marker)) return page;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.fail(`${name} was never served`);
}

before(async () => {
  project = mkdtempSync(join(tmpdir(), "visual-preview-"));
  info = script("start-server.sh", ["--project-dir", project]);
  const first = await get(`/?key=${new URL(info.url).searchParams.get("key")}`);
  cookie = first.headers.get("set-cookie").split(";")[0];
});

after(() => {
  rmSync(project, { recursive: true, force: true });
});

test("start prints a keyed localhost URL and folders inside the project", () => {
  assert.equal(info.type, "server-started");
  assert.match(info.url, /^http:\/\/localhost:\d+\/\?key=[0-9a-f]{64}$/);
  assert.ok(info.screen_dir.startsWith(join(project, ".visual-preview")), info.screen_dir);
  assert.equal(readFileSync(join(project, ".visual-preview", ".gitignore"), "utf8"), "*\n");
});

test("a request without the key, or with a wrong one, gets 403", async () => {
  assert.equal((await get("/")).status, 403);
  assert.equal((await get(`/?key=${"0".repeat(64)}`)).status, 403);
});

test("a fragment is served inside the frame, with the click script", async () => {
  const page = await push("layout.html", '<h2>Layout A</h2><div data-choice="a">A</div>', "Layout A");

  assert.match(page, /<title>Vista previa<\/title>/);
  assert.match(page, /class="phone"|\.phone \{/);
  assert.match(page, /toggleSelect/);
});

test("a full document is served as-is, plus the click script", async () => {
  const page = await push("full.html", "<!DOCTYPE html><html><body><p>Full doc</p></body></html>", "Full doc");

  assert.doesNotMatch(page, /<title>Vista previa<\/title>/);
  assert.match(page, /toggleSelect/);
});

test("a click sent over the WebSocket lands in the events file", { skip: typeof WebSocket === "undefined" && "no global WebSocket" }, async () => {
  const key = new URL(info.url).searchParams.get("key");
  const socket = new WebSocket(`ws://localhost:${info.port}/?key=${key}`);
  await new Promise((resolve, reject) => {
    socket.onopen = resolve;
    socket.onerror = reject;
  });
  socket.send(JSON.stringify({ type: "click", choice: "b", text: "Opción B" }));
  socket.close();

  const events = join(info.state_dir, "events");
  for (let attempt = 0; attempt < 50 && !existsSync(events); attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.deepEqual(JSON.parse(readFileSync(events, "utf8").trim()), { type: "click", choice: "b", text: "Opción B" });
});

test("stop ends the server and keeps the project's screens", async () => {
  const sessionDir = dirname(info.screen_dir);

  assert.deepEqual(script("stop-server.sh", [sessionDir]), { status: "stopped" });
  assert.ok(existsSync(join(info.state_dir, "server-stopped")));
  assert.ok(!existsSync(join(info.state_dir, "server-info")));
  assert.ok(existsSync(join(info.screen_dir, "layout.html")));
  await assert.rejects(get("/"));
});
