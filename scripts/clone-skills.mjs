#!/usr/bin/env node
// Clone (or update) the thecolab.ai skills corpus into the sibling directory the
// app reads from. The skills explorer loads skills from SKILLS_DIR, defaulting
// to ../.skills/skills relative to this project (see src/lib/skill-exec.ts).
//
//   pnpm skills:clone        # clone if missing, fast-forward pull if present
//
// Override the source repo with SKILLS_REPO. The clone target is the parent of
// SKILLS_DIR when that env var is set, otherwise ../.skills.

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPO = process.env.SKILLS_REPO ?? "https://github.com/thecolab-ai/.skills.git";

// The app reads <SKILLS_DIR>; the git checkout is its parent (the repo has a
// top-level skills/ folder). Default checkout: <project>/../.skills
const target = process.env.SKILLS_DIR
  ? path.resolve(path.dirname(path.resolve(process.env.SKILLS_DIR)))
  : path.resolve(projectRoot, "..", ".skills");

function git(args, opts = {}) {
  const r = spawnSync("git", args, { stdio: "inherit", ...opts });
  if (r.status !== 0) {
    console.error(`\n✗ git ${args.join(" ")} failed (exit ${r.status ?? "?"}).`);
    process.exit(r.status ?? 1);
  }
}

if (fs.existsSync(path.join(target, ".git"))) {
  console.log(`↻ Updating skills in ${target}`);
  git(["-C", target, "pull", "--ff-only"]);
} else {
  if (fs.existsSync(target) && fs.readdirSync(target).length > 0) {
    console.error(`✗ ${target} exists but is not a git checkout. Remove it or set SKILLS_DIR.`);
    process.exit(1);
  }
  console.log(`⤓ Cloning ${REPO} → ${target}`);
  git(["clone", "--depth", "1", REPO, target]);
}

const skillsDir = path.join(target, "skills");
const count = fs.existsSync(skillsDir)
  ? fs.readdirSync(skillsDir, { withFileTypes: true }).filter((d) => d.isDirectory()).length
  : 0;
console.log(`✓ ${count} skills ready at ${skillsDir}`);
