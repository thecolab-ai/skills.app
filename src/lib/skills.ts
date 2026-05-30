// Server-side skill manifest: reads ../.skills/skills via fs at request time.
// Source of truth for which skills exist, their frontmatter, files, env keys,
// and category. CLI arguments are discovered separately by ./introspect.

import "server-only";

import fs from "node:fs";
import path from "node:path";

import { categoryFor } from "@/lib/skill-categories";
import { SKILLS_ROOT, resolveSkillFile } from "@/lib/skill-exec";
import corpus from "@/lib/skills-introspection.json";
import type {
  SkillDetail,
  SkillEnvVar,
  SkillFileRef,
  SkillSummary,
} from "@/lib/skills-types";

const MAX_FILE_BYTES = 512 * 1024;

// A genuine credential, not an optional tuning knob. Anchored to real suffixes
// so e.g. BUNNINGS_GUEST_TOKEN_CACHE_SECONDS (a cache duration) is NOT a secret.
const SECRET_RE =
  /(?:API_?KEY)|_(?:KEY|TOKEN|SECRET|PASSWORD|PASSWD|USERNAME|CREDENTIALS?)$/;
const ENV_IN_CODE_RE =
  /(?:os\.environ(?:\.get)?\(\s*|os\.getenv\(\s*|environ\[\s*)["']([A-Z0-9_]+)["']/g;
const ENV_TOKEN_RE = /\b([A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+)\b/g;

function isSecret(name: string): boolean {
  return SECRET_RE.test(name);
}

interface Frontmatter {
  name: string;
  description: string;
  body: string;
}

function parseFrontmatter(md: string): Frontmatter {
  const m = md.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
  if (!m) return { name: "", description: "", body: md };
  const block = m[1];
  const body = md.slice(m[0].length);
  const get = (key: string): string => {
    const km = block.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
    return km ? km[1].trim().replace(/^["']|["']$/g, "") : "";
  };
  return { name: get("name"), description: get("description"), body };
}

function detectEnvVars(
  skillName: string,
  cliSrc: string,
  description: string,
): SkillEnvVar[] {
  const names = new Set<string>();
  for (const m of cliSrc.matchAll(ENV_IN_CODE_RE)) names.add(m[1]);
  // Capture env vars declared in the frontmatter after a "Requires" clause
  // (e.g. akahu reads its tokens via a helper, not a literal os.environ call).
  const reqIdx = description.search(/Requires?/i);
  if (reqIdx >= 0) {
    const tail = description.slice(reqIdx);
    for (const m of tail.matchAll(ENV_TOKEN_RE)) {
      if (m[1].length >= 5 && m[1] !== "AND") names.add(m[1]);
    }
  }
  return [...names].sort().map((name) => ({ name, secret: isSecret(name) }));
}

function subcommandCount(name: string): number {
  const entry = (
    corpus as Record<string, { subcommands?: Record<string, unknown> }>
  )[name];
  if (!entry?.subcommands) return 0;
  const keys = Object.keys(entry.subcommands);
  if (keys.length === 1 && keys[0] === "(default)") return 1;
  return keys.length;
}

function readSkillSource(dir: string): string {
  try {
    return fs.readFileSync(path.join(dir, "scripts", "cli.py"), "utf8");
  } catch {
    return "";
  }
}

function buildSummary(name: string): SkillSummary | null {
  const dir = path.join(SKILLS_ROOT, name);
  const skillMd = path.join(dir, "SKILL.md");
  if (!fs.existsSync(skillMd)) return null;
  const fm = parseFrontmatter(fs.readFileSync(skillMd, "utf8"));
  const cliSrc = readSkillSource(dir);
  const envVars = detectEnvVars(name, cliSrc, fm.description);
  const cat = categoryFor(name);
  return {
    name,
    description: fm.description,
    category: cat.id,
    categoryLabel: cat.label,
    keyGated: envVars.some((e) => e.secret),
    envVars,
    subcommandCount: subcommandCount(name),
  };
}

export function listSkillNames(): string[] {
  try {
    return fs
      .readdirSync(SKILLS_ROOT, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .filter((n) => fs.existsSync(path.join(SKILLS_ROOT, n, "SKILL.md")))
      .sort();
  } catch {
    return [];
  }
}

export function listSkills(): SkillSummary[] {
  return listSkillNames()
    .map(buildSummary)
    .filter((s): s is SkillSummary => s !== null);
}

function listFiles(dir: string): SkillFileRef[] {
  const files: SkillFileRef[] = [];
  const push = (rel: string, kind: SkillFileRef["kind"]) => {
    const abs = path.join(dir, rel);
    if (!fs.existsSync(abs)) return;
    const ext = path.extname(rel).toLowerCase();
    const language: SkillFileRef["language"] =
      ext === ".py" ? "python" : ext === ".md" ? "markdown" : "text";
    files.push({ name: path.basename(rel), rel, kind, language });
  };
  // scripts/*.py
  const scriptsDir = path.join(dir, "scripts");
  if (fs.existsSync(scriptsDir)) {
    for (const f of fs.readdirSync(scriptsDir).sort()) {
      if (f.endsWith(".py")) push(path.join("scripts", f), "script");
    }
  }
  // references/*.md
  const refsDir = path.join(dir, "references");
  if (fs.existsSync(refsDir)) {
    for (const f of fs.readdirSync(refsDir).sort()) {
      if (f.endsWith(".md")) push(path.join("references", f), "reference");
    }
  }
  return files;
}

export function getSkill(name: string): SkillDetail | null {
  const summary = buildSummary(name);
  if (!summary) return null;
  const dir = path.join(SKILLS_ROOT, name);
  const fm = parseFrontmatter(
    fs.readFileSync(path.join(dir, "SKILL.md"), "utf8"),
  );
  const files = listFiles(dir);
  return {
    ...summary,
    skillMarkdown: fm.body.trim(),
    frontmatter: { name: fm.name, description: fm.description },
    files,
    hasReferences: files.some((f) => f.kind === "reference"),
  };
}

/** Read a skill file for the Code tab. Confined + size-capped by skill-exec. */
export function readSkillFileText(name: string, rel: string): string {
  const abs = resolveSkillFile(name, rel);
  const stat = fs.statSync(abs);
  if (stat.size > MAX_FILE_BYTES) {
    const fd = fs.openSync(abs, "r");
    const buf = Buffer.alloc(MAX_FILE_BYTES);
    fs.readSync(fd, buf, 0, MAX_FILE_BYTES, 0);
    fs.closeSync(fd);
    return `${buf.toString("utf8")}\n\n… (truncated at ${MAX_FILE_BYTES / 1024} KB)`;
  }
  return fs.readFileSync(abs, "utf8");
}
