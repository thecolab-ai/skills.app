// Shared types for the thecolab.ai Skills Explorer.
// The skill manifest is read server-side from ../.skills/skills via fs; the CLI
// interface is discovered by introspecting `python3 cli.py --help` at request time.

export type FileKind = "skill" | "script" | "reference" | "other";

export interface SkillFileRef {
  /** display name, e.g. "cli.py" */
  name: string;
  /** path relative to the skill directory, e.g. "scripts/cli.py" */
  rel: string;
  kind: FileKind;
  /** language hint for the syntax highlighter */
  language: "python" | "markdown" | "text";
}

export interface SkillEnvVar {
  name: string;
  /** true when the var looks like a secret/credential (API key, token, password) */
  secret: boolean;
}

export interface SkillSummary {
  name: string;
  description: string;
  category: string;
  categoryLabel: string;
  /** true when the skill requires a secret credential to run its data commands */
  keyGated: boolean;
  envVars: SkillEnvVar[];
  subcommandCount: number;
}

export interface SkillDetail extends SkillSummary {
  /** SKILL.md body with the YAML frontmatter stripped */
  skillMarkdown: string;
  frontmatter: { name: string; description: string };
  /** scripts/ + references/ files available to browse in the Code tab */
  files: SkillFileRef[];
  hasReferences: boolean;
}

// ── CLI introspection ────────────────────────────────────────────────────────

export interface CliOption {
  /** the long flag, e.g. "--json" or "--location" */
  flag: string;
  /** whether the flag consumes a value */
  takesValue: boolean;
  /** metavar shown in --help, e.g. "LAT,LON" (null for booleans) */
  metavar: string | null;
  /** enumerated choices when the flag is a {a,b,c} choice */
  choices: string[] | null;
  help: string;
}

export interface CliPositional {
  name: string;
  help: string;
  required: boolean;
}

export interface CliSubcommand {
  name: string;
  summary: string;
  usage: string;
  positionals: CliPositional[];
  options: CliOption[];
  /** whether this subcommand accepts --json */
  hasJson: boolean;
}

export interface CliIntrospection {
  /** options that appear before the subcommand (e.g. bunnings --country {au,nz}) */
  globalOptions: CliOption[];
  subcommands: CliSubcommand[];
  /** false for single-command CLIs (the one entry is named "(default)") */
  hasSubcommands: boolean;
  /** "live" when freshly introspected, "fallback" when served from the static corpus */
  source: "live" | "fallback";
}

// ── Runner jobs ──────────────────────────────────────────────────────────────

export type RunStatus = "running" | "done" | "failed";

export interface RunJobView {
  id: string;
  skill: string;
  /** the exact command that was executed, for display */
  command: string;
  status: RunStatus;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  /** epoch ms */
  startedAt: number;
  finishedAt: number | null;
  /** elapsed ms (live while running) */
  elapsedMs: number;
  /** true when output was capped by the buffer limit */
  truncated: boolean;
  /** populated when the run was killed by the timeout/buffer guard */
  note?: string;
}
