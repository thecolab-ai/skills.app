import { type NextRequest, NextResponse } from "next/server";

import {
  appendStderr,
  appendStdout,
  countRunning,
  createJob,
  finishJob,
} from "@/lib/run-store";
import { spawnSkill } from "@/lib/skill-exec";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_ARGS = 64;
const MAX_ARG_LEN = 4096;
// Bound concurrent child processes so a flood of requests can't exhaust the host.
const MAX_CONCURRENT_RUNS = 8;

interface RunBody {
  skill?: string;
  args?: unknown[];
  env?: Record<string, unknown>;
}

export async function POST(req: NextRequest) {
  let body: RunBody;
  try {
    body = (await req.json()) as RunBody;
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const skill = body.skill;
  if (typeof skill !== "string" || !skill) {
    return NextResponse.json({ error: "missing skill" }, { status: 400 });
  }

  const rawArgs = Array.isArray(body.args) ? body.args : [];
  if (rawArgs.length > MAX_ARGS) {
    return NextResponse.json({ error: "too many arguments" }, { status: 400 });
  }
  const args = rawArgs.map((a) => String(a));
  if (args.some((a) => a.length > MAX_ARG_LEN)) {
    return NextResponse.json({ error: "argument too long" }, { status: 400 });
  }

  if (countRunning() >= MAX_CONCURRENT_RUNS) {
    return NextResponse.json(
      {
        error:
          "Too many runs in progress — wait for a running skill to finish.",
      },
      { status: 429 },
    );
  }

  const command = ["python3", "cli.py", ...args].join(" ");

  try {
    const job = createJob(skill, command);
    spawnSkill(skill, args, body.env, {
      onStdout: (c) => appendStdout(job.id, c),
      onStderr: (c) => appendStderr(job.id, c),
      onClose: (code, note) => finishJob(job.id, code, note),
    });
    return NextResponse.json({ id: job.id, command });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to start run" },
      { status: 400 },
    );
  }
}
