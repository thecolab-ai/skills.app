// Safe, confined execution of skill CLIs.
//
// Guardrails:
//  • Only scripts inside <SKILLS_ROOT>/<skill>/scripts/ are ever executed.
//  • The skill name is validated against a strict pattern AND must resolve to a
//    real directory under SKILLS_ROOT (rejects path traversal / symlink escapes).
//  • Spawned with an argv array and shell:false — never an interpolated string.
//  • A minimal env is constructed (no inheriting the server's secrets); the user
//    supplies any required keys per-run.
//  • Output is capped and the process is killed on timeout or buffer overflow.

import { type ChildProcess, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

/** Absolute path to ../.skills/skills, overridable via SKILLS_DIR. */
export const SKILLS_ROOT = path.resolve(
  process.env.SKILLS_DIR ?? path.join(process.cwd(), "..", ".skills", "skills"),
);

export const PYTHON_BIN = process.env.PYTHON_BIN ?? "python3";
export const RUN_TIMEOUT_MS = 30_000;
export const MAX_OUTPUT_BYTES = 512 * 1024; // 512 KB per stream
export const HELP_MAX_BYTES = 256 * 1024; // cap on --help introspection output

const SKILL_NAME_RE = /^[a-z0-9][a-z0-9-]*$/;

/** Validate a skill name and confirm it resolves to a real skill directory. */
export function resolveSkillDir(name: string): string {
  if (typeof name !== "string" || !SKILL_NAME_RE.test(name)) {
    throw new Error(`Invalid skill name: ${JSON.stringify(name)}`);
  }
  const dir = path.resolve(SKILLS_ROOT, name);
  // Path-traversal guard: the resolved dir must sit directly under SKILLS_ROOT.
  if (path.dirname(dir) !== SKILLS_ROOT) {
    throw new Error(`Skill name escapes the skills directory: ${name}`);
  }
  const real = fs.realpathSync(dir); // throws if missing
  if (real !== dir && !real.startsWith(SKILLS_ROOT + path.sep)) {
    throw new Error(`Skill resolves outside the skills directory: ${name}`);
  }
  if (!fs.statSync(real).isDirectory()) {
    throw new Error(`Not a skill directory: ${name}`);
  }
  return real;
}

/** Resolve and confine the CLI entrypoint for a skill. */
export function resolveCliPath(name: string): string {
  const dir = resolveSkillDir(name);
  const cli = path.join(dir, "scripts", "cli.py");
  if (!fs.existsSync(cli)) {
    throw new Error(`Skill has no scripts/cli.py: ${name}`);
  }
  return cli;
}

/**
 * Resolve a file path for read-only viewing, confined to the skill directory and
 * limited to source/markdown files. Rejects traversal and unexpected extensions.
 */
export function resolveSkillFile(name: string, rel: string): string {
  const dir = resolveSkillDir(name);
  if (typeof rel !== "string" || rel.includes("\0")) {
    throw new Error("Invalid file path");
  }
  const target = path.resolve(dir, rel);
  if (target !== dir && !target.startsWith(dir + path.sep)) {
    throw new Error(`File escapes the skill directory: ${rel}`);
  }
  const ext = path.extname(target).toLowerCase();
  if (![".py", ".md", ".txt", ".json"].includes(ext)) {
    throw new Error(`File type not viewable: ${ext || "(none)"}`);
  }
  const real = fs.realpathSync(target);
  if (!real.startsWith(dir + path.sep)) {
    throw new Error(`File resolves outside the skill directory: ${rel}`);
  }
  return real;
}

/** A deliberately minimal environment — no server secrets leak to the child. */
function baseEnv(): NodeJS.ProcessEnv {
  const allow = ["PATH", "HOME", "LANG", "LC_ALL", "LC_CTYPE", "TMPDIR", "TZ"];
  const env: NodeJS.ProcessEnv = { NODE_ENV: process.env.NODE_ENV };
  for (const k of allow) if (process.env[k]) env[k] = process.env[k];
  // Keep python output unbuffered so streaming/polling sees lines promptly.
  env.PYTHONUNBUFFERED = "1";
  return env;
}

const ENV_NAME_RE = /^[A-Z][A-Z0-9_]*$/;

/** Sanitise user-supplied env: only well-formed names, values coerced to strings. */
export function sanitiseEnv(
  userEnv: Record<string, unknown> | undefined,
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!userEnv) return out;
  for (const [k, v] of Object.entries(userEnv)) {
    if (!ENV_NAME_RE.test(k)) continue;
    if (v == null) continue;
    const s = String(v);
    if (s.length > 8192) continue;
    out[k] = s;
  }
  return out;
}

/**
 * Run a skill's CLI for introspection (`--help`). Resolves quickly with the
 * captured stdout. Used by the live introspector; never runs data commands.
 */
export function runHelp(
  name: string,
  preArgs: string[],
  timeoutMs = 10_000,
): Promise<string> {
  const cli = resolveCliPath(name);
  const dir = path.dirname(path.dirname(cli));
  return new Promise((resolve) => {
    let out = "";
    let err = "";
    let done = false;
    const child = spawn(PYTHON_BIN, [cli, ...preArgs, "--help"], {
      cwd: dir,
      env: baseEnv(),
      shell: false,
    });
    const timer = setTimeout(() => {
      if (!done) child.kill("SIGKILL");
    }, timeoutMs);
    // Cap accumulated output and kill on overflow — a buggy/malicious skill's
    // --help could otherwise stream unbounded data for the whole timeout window.
    const cap = (current: string, chunk: string): string => {
      if (current.length >= HELP_MAX_BYTES) {
        child.kill("SIGKILL");
        return current;
      }
      const next = current + chunk;
      if (next.length >= HELP_MAX_BYTES) {
        child.kill("SIGKILL");
        return next.slice(0, HELP_MAX_BYTES);
      }
      return next;
    };
    child.stdout.on("data", (d) => {
      out = cap(out, d.toString());
    });
    child.stderr.on("data", (d) => {
      err = cap(err, d.toString());
    });
    child.on("error", () => {
      done = true;
      clearTimeout(timer);
      resolve("");
    });
    child.on("close", () => {
      done = true;
      clearTimeout(timer);
      resolve(out || err);
    });
  });
}

export interface SpawnHandlers {
  onStdout(chunk: string): void;
  onStderr(chunk: string): void;
  /** Called once when the process ends. note set when killed by a guard. */
  onClose(exitCode: number | null, note?: string): void;
}

export interface SpawnResult {
  /** the exact command string, for display */
  command: string;
  child: ChildProcess;
}

/**
 * Spawn a confined skill run. Returns immediately; the handlers receive output
 * as it streams and a single onClose at the end.
 */
export function spawnSkill(
  name: string,
  args: string[],
  userEnv: Record<string, unknown> | undefined,
  handlers: SpawnHandlers,
): SpawnResult {
  const cli = resolveCliPath(name);
  const dir = path.dirname(path.dirname(cli));
  const safeArgs = (Array.isArray(args) ? args : []).map((a) => String(a));
  const env = { ...baseEnv(), ...sanitiseEnv(userEnv) };

  const child = spawn(PYTHON_BIN, [cli, ...safeArgs], {
    cwd: dir,
    env,
    shell: false,
  });

  const command = [PYTHON_BIN, "cli.py", ...safeArgs].join(" ");

  let outBytes = 0;
  let errBytes = 0;
  let closed = false;
  let guardNote: string | undefined;

  const timer = setTimeout(() => {
    guardNote = `Run exceeded the ${RUN_TIMEOUT_MS / 1000}s time limit and was stopped.`;
    child.kill("SIGKILL");
  }, RUN_TIMEOUT_MS);

  child.stdout.on("data", (d: Buffer) => {
    if (outBytes >= MAX_OUTPUT_BYTES) return;
    const room = MAX_OUTPUT_BYTES - outBytes;
    const text = d.toString();
    const slice = text.length > room ? text.slice(0, room) : text;
    outBytes += slice.length;
    handlers.onStdout(slice);
    if (outBytes >= MAX_OUTPUT_BYTES) {
      guardNote = `Output exceeded ${MAX_OUTPUT_BYTES / 1024} KB and was truncated.`;
      child.kill("SIGKILL");
    }
  });

  child.stderr.on("data", (d: Buffer) => {
    if (errBytes >= MAX_OUTPUT_BYTES) return;
    const room = MAX_OUTPUT_BYTES - errBytes;
    const text = d.toString();
    const slice = text.length > room ? text.slice(0, room) : text;
    errBytes += slice.length;
    handlers.onStderr(slice);
  });

  child.on("error", (e) => {
    if (closed) return;
    closed = true;
    clearTimeout(timer);
    handlers.onStderr(`\n[failed to start: ${e.message}]`);
    handlers.onClose(null, "Failed to start the Python process.");
  });

  child.on("close", (code) => {
    if (closed) return;
    closed = true;
    clearTimeout(timer);
    handlers.onClose(code, guardNote);
  });

  return { command, child };
}
