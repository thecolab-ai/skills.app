// In-memory job store for skill runs. Lives in the Node server process; jobs are
// created by the run route, fed by the spawned child's output handlers, and read
// by the polling route. Stored on globalThis so it survives dev HMR reloads.

import { randomUUID } from "node:crypto";

import type { RunJobView, RunStatus } from "@/lib/skills-types";

interface RunJob {
  id: string;
  skill: string;
  command: string;
  status: RunStatus;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  startedAt: number;
  finishedAt: number | null;
  truncated: boolean;
  note?: string;
}

const MAX_JOBS = 200;
const JOB_TTL_MS = 15 * 60_000;

const globalForJobs = globalThis as unknown as {
  __skillRunJobs?: Map<string, RunJob>;
};
globalForJobs.__skillRunJobs ??= new Map();
const jobs: Map<string, RunJob> = globalForJobs.__skillRunJobs;

function sweep(): void {
  const now = Date.now();
  for (const [id, job] of jobs) {
    const age = now - (job.finishedAt ?? job.startedAt);
    if (job.status !== "running" && age > JOB_TTL_MS) jobs.delete(id);
  }
  // Evict oldest FINISHED jobs only — never drop a running job's record (which
  // would orphan its child process from the concurrency accounting).
  if (jobs.size > MAX_JOBS) {
    for (const [id, job] of jobs) {
      if (jobs.size <= MAX_JOBS) break;
      if (job.status !== "running") jobs.delete(id);
    }
  }
}

/** Number of jobs currently running — used to bound concurrent process spawns. */
export function countRunning(): number {
  let n = 0;
  for (const job of jobs.values()) if (job.status === "running") n++;
  return n;
}

export function createJob(skill: string, command: string): RunJob {
  sweep();
  const job: RunJob = {
    id: randomUUID(),
    skill,
    command,
    status: "running",
    stdout: "",
    stderr: "",
    exitCode: null,
    startedAt: Date.now(),
    finishedAt: null,
    truncated: false,
  };
  jobs.set(job.id, job);
  return job;
}

export function appendStdout(id: string, chunk: string): void {
  const job = jobs.get(id);
  if (job) job.stdout += chunk;
}

export function appendStderr(id: string, chunk: string): void {
  const job = jobs.get(id);
  if (job) job.stderr += chunk;
}

export function finishJob(
  id: string,
  exitCode: number | null,
  note?: string,
): void {
  const job = jobs.get(id);
  if (!job) return;
  job.exitCode = exitCode;
  job.finishedAt = Date.now();
  job.status = exitCode === 0 ? "done" : "failed";
  if (note) {
    job.note = note;
    job.truncated = note.toLowerCase().includes("truncated");
  }
}

export function getJobView(id: string): RunJobView | null {
  const job = jobs.get(id);
  if (!job) return null;
  return {
    id: job.id,
    skill: job.skill,
    command: job.command,
    status: job.status,
    stdout: job.stdout,
    stderr: job.stderr,
    exitCode: job.exitCode,
    startedAt: job.startedAt,
    finishedAt: job.finishedAt,
    elapsedMs: (job.finishedAt ?? Date.now()) - job.startedAt,
    truncated: job.truncated,
    note: job.note,
  };
}
