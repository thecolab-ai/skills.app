"use client";

import { CheckCircle2, KeyRound, Loader2, Play, XCircle } from "lucide-react";
import { useCallback, useId, useMemo, useRef, useState } from "react";

import { JsonTree } from "@/components/skills/json-tree";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type {
  CliIntrospection,
  CliOption,
  CliSubcommand,
  RunJobView,
  SkillEnvVar,
} from "@/lib/skills-types";
import { cn } from "@/lib/utils";

const NONE = "__none__";

interface RunnerSkill {
  name: string;
  envVars: SkillEnvVar[];
  keyGated: boolean;
}

export function RunnerPanel({
  skill,
  introspection,
}: {
  skill: RunnerSkill;
  introspection: CliIntrospection;
}) {
  const subs = introspection.subcommands;
  const [subName, setSubName] = useState(subs[0]?.name ?? "(default)");
  const sub = subs.find((s) => s.name === subName) ?? subs[0];

  const [posVals, setPosVals] = useState<Record<string, string>>({});
  const [optVals, setOptVals] = useState<Record<string, string | boolean>>({});
  const [globalVals, setGlobalVals] = useState<
    Record<string, string | boolean>
  >({});
  const [envVals, setEnvVals] = useState<Record<string, string>>({});
  const [jsonOn, setJsonOn] = useState(sub?.hasJson ?? false);

  const [job, setJob] = useState<RunJobView | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultView, setResultView] = useState<"json" | "raw">("json");
  const runToken = useRef(0);

  const selectSub = (name: string) => {
    setSubName(name);
    setPosVals({});
    setOptVals({});
    const next = subs.find((s) => s.name === name);
    setJsonOn(next?.hasJson ?? false);
  };

  const argv = useMemo(
    () =>
      buildArgv({
        introspection,
        sub,
        globalVals,
        posVals,
        optVals,
        jsonOn,
      }),
    [introspection, sub, globalVals, posVals, optVals, jsonOn],
  );

  const missingRequired = (sub?.positionals ?? []).filter(
    (p) => p.required && !(posVals[p.name] ?? "").trim(),
  );

  const run = useCallback(async () => {
    setError(null);
    setRunning(true);
    setJob(null);
    setResultView(jsonOn ? "json" : "raw");
    const token = ++runToken.current;

    const env: Record<string, string> = {};
    for (const [k, v] of Object.entries(envVals)) if (v.trim()) env[k] = v;

    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ skill: skill.name, args: argv, env }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to start run");
        setRunning(false);
        return;
      }
      const poll = async () => {
        if (token !== runToken.current) return;
        const r = await fetch(`/api/run/${data.id}`);
        if (!r.ok) {
          setRunning(false);
          return;
        }
        const view: RunJobView = await r.json();
        if (token !== runToken.current) return;
        setJob(view);
        if (view.status === "running") setTimeout(poll, 600);
        else setRunning(false);
      };
      poll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
      setRunning(false);
    }
  }, [argv, envVals, jsonOn, skill.name]);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {/* ── Form ── */}
      <div className="flex flex-col gap-5">
        {introspection.source === "fallback" ? (
          <p className="rounded-md bg-muted px-3 py-2 text-muted-foreground text-xs">
            Showing a cached interface (live introspection was unavailable).
          </p>
        ) : null}

        {/* Global options (e.g. --country) */}
        {introspection.globalOptions.length > 0 ? (
          <FieldGroup title="Options">
            {introspection.globalOptions.map((o) => (
              <OptionField
                key={`g-${o.flag}`}
                option={o}
                value={globalVals[o.flag]}
                onChange={(v) => setGlobalVals((s) => ({ ...s, [o.flag]: v }))}
              />
            ))}
          </FieldGroup>
        ) : null}

        {/* Subcommand */}
        {introspection.hasSubcommands ? (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="runner-command">Command</Label>
            <Select value={subName} onValueChange={selectSub}>
              <SelectTrigger id="runner-command" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {subs.map((s) => (
                  <SelectItem key={s.name} value={s.name}>
                    <span className="font-mono">{s.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {sub?.summary ? (
              <p className="text-muted-foreground text-xs">{sub.summary}</p>
            ) : null}
          </div>
        ) : null}

        {/* Positionals */}
        {(sub?.positionals ?? []).length > 0 ? (
          <FieldGroup title="Arguments">
            {sub.positionals.map((p) => (
              <div key={p.name} className="flex flex-col gap-1.5">
                <Label htmlFor={`pos-${p.name}`} className="font-mono">
                  {p.name}
                  {p.required ? (
                    <span className="ml-1 text-brand-orange">*</span>
                  ) : (
                    <span className="ml-1 text-muted-foreground text-xs">
                      (optional)
                    </span>
                  )}
                </Label>
                <Input
                  id={`pos-${p.name}`}
                  name={p.name}
                  value={posVals[p.name] ?? ""}
                  onChange={(e) =>
                    setPosVals((s) => ({ ...s, [p.name]: e.target.value }))
                  }
                  placeholder={p.help || p.name}
                />
                {p.help ? (
                  <p className="text-muted-foreground text-xs">{p.help}</p>
                ) : null}
              </div>
            ))}
          </FieldGroup>
        ) : null}

        {/* Options */}
        {(sub?.options ?? []).filter((o) => o.flag !== "--json").length > 0 ? (
          <FieldGroup title="Flags">
            {sub.options
              .filter((o) => o.flag !== "--json")
              .map((o) => (
                <OptionField
                  key={o.flag}
                  option={o}
                  value={optVals[o.flag]}
                  onChange={(v) => setOptVals((s) => ({ ...s, [o.flag]: v }))}
                />
              ))}
          </FieldGroup>
        ) : null}

        {/* JSON output toggle */}
        {sub?.hasJson ? (
          <div className="flex items-center justify-between rounded-lg border bg-card px-3 py-2.5">
            <span className="flex flex-col">
              <span className="font-medium text-sm">Output as JSON</span>
              <span className="text-muted-foreground text-xs">
                Appends <code className="font-mono">--json</code> for a
                structured result
              </span>
            </span>
            <Switch
              aria-label="Output as JSON"
              checked={jsonOn}
              onCheckedChange={setJsonOn}
            />
          </div>
        ) : null}

        {/* Env / keys */}
        {skill.envVars.length > 0 ? (
          <FieldGroup
            title="Environment"
            hint="Provided only for this run — never stored."
          >
            {skill.keyGated ? (
              <p className="flex items-start gap-2 rounded-md border border-brand-orange/30 bg-brand-orange/5 px-3 py-2 text-brand-orange text-xs">
                <KeyRound className="mt-0.5 size-3.5 shrink-0" />
                This skill needs a credential for most commands. Enter it below;
                some commands (e.g. public scrapes) may still work without one.
              </p>
            ) : null}
            {skill.envVars.map((ev) => (
              <div key={ev.name} className="flex flex-col gap-1.5">
                <Label
                  htmlFor={`env-${ev.name}`}
                  className="flex items-center gap-1.5 font-mono text-xs"
                >
                  {ev.name}
                  {ev.secret ? (
                    <Badge
                      variant="outline"
                      className="h-4 gap-0.5 px-1 text-[0.6rem]"
                    >
                      <KeyRound className="size-2.5" />
                      secret
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">(optional)</span>
                  )}
                </Label>
                <Input
                  id={`env-${ev.name}`}
                  name={ev.name}
                  type={ev.secret ? "password" : "text"}
                  autoComplete="off"
                  value={envVals[ev.name] ?? ""}
                  onChange={(e) =>
                    setEnvVals((s) => ({ ...s, [ev.name]: e.target.value }))
                  }
                  placeholder={ev.secret ? "key / token" : "value"}
                />
              </div>
            ))}
          </FieldGroup>
        ) : null}

        {/* Command preview + run */}
        <div className="flex flex-col gap-2">
          <Label className="text-muted-foreground text-xs">Command</Label>
          <code className="block overflow-x-auto whitespace-pre rounded-lg border bg-brand-navy px-3 py-2.5 font-mono text-[0.8125rem] text-brand-cream">
            python3 cli.py {argv.join(" ")}
          </code>
          <div className="flex items-center gap-3">
            <Button
              onClick={run}
              disabled={running || missingRequired.length > 0}
              className="gap-2"
            >
              {running ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Play className="size-4" />
              )}
              {running ? "Running…" : "Run skill"}
            </Button>
            {missingRequired.length > 0 ? (
              <span className="text-muted-foreground text-xs">
                Fill in{" "}
                <span className="font-mono text-brand-orange">
                  {missingRequired.map((p) => p.name).join(", ")}
                </span>
              </span>
            ) : null}
          </div>
          {error ? <p className="text-destructive text-sm">{error}</p> : null}
        </div>
      </div>

      {/* ── Result ── */}
      <div className="lg:sticky lg:top-4 lg:self-start">
        <ResultPanel
          job={job}
          running={running}
          jsonOn={jsonOn}
          resultView={resultView}
          setResultView={setResultView}
        />
      </div>
    </div>
  );
}

// ── building the argv ────────────────────────────────────────────────────────

function buildArgv({
  introspection,
  sub,
  globalVals,
  posVals,
  optVals,
  jsonOn,
}: {
  introspection: CliIntrospection;
  sub: CliSubcommand | undefined;
  globalVals: Record<string, string | boolean>;
  posVals: Record<string, string>;
  optVals: Record<string, string | boolean>;
  jsonOn: boolean;
}): string[] {
  const argv: string[] = [];
  const pushOpt = (o: CliOption, v: string | boolean | undefined) => {
    if (o.choices || o.takesValue) {
      const s = typeof v === "string" ? v.trim() : "";
      if (s && s !== NONE) argv.push(o.flag, s);
    } else if (v === true) {
      argv.push(o.flag);
    }
  };

  for (const o of introspection.globalOptions) {
    if (o.flag === "--json") continue;
    pushOpt(o, globalVals[o.flag]);
  }
  if (introspection.hasSubcommands && sub) argv.push(sub.name);
  for (const p of sub?.positionals ?? []) {
    const v = (posVals[p.name] ?? "").trim();
    if (v) argv.push(v);
  }
  for (const o of sub?.options ?? []) {
    if (o.flag === "--json") continue;
    pushOpt(o, optVals[o.flag]);
  }
  if (jsonOn && sub?.hasJson) argv.push("--json");
  return argv;
}

// ── form field for a single option ───────────────────────────────────────────

function OptionField({
  option,
  value,
  onChange,
}: {
  option: CliOption;
  value: string | boolean | undefined;
  onChange: (v: string | boolean) => void;
}) {
  const fieldId = useId();
  if (option.choices) {
    return (
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={fieldId} className="font-mono text-xs">
          {option.flag}
        </Label>
        <Select
          value={typeof value === "string" ? value : NONE}
          onValueChange={onChange}
        >
          <SelectTrigger id={fieldId} className="w-full">
            <SelectValue placeholder="(default)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>(default)</SelectItem>
            {option.choices.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {option.help ? (
          <p className="text-muted-foreground text-xs">{option.help}</p>
        ) : null}
      </div>
    );
  }

  if (option.takesValue) {
    return (
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={fieldId} className="font-mono text-xs">
          {option.flag}{" "}
          {option.metavar ? (
            <span className="text-muted-foreground">{option.metavar}</span>
          ) : null}
        </Label>
        <Input
          id={fieldId}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={option.help || option.metavar || ""}
        />
      </div>
    );
  }

  // boolean flag
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
      <span className="flex flex-col">
        <span className="font-mono text-sm">{option.flag}</span>
        {option.help ? (
          <span className="text-muted-foreground text-xs">{option.help}</span>
        ) : null}
      </span>
      <Switch
        aria-label={option.flag}
        checked={value === true}
        onCheckedChange={onChange}
      />
    </div>
  );
}

function FieldGroup({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="flex w-full items-baseline justify-between font-semibold text-foreground text-sm">
        <span>{title}</span>
        {hint ? (
          <span className="font-normal text-muted-foreground text-xs">
            {hint}
          </span>
        ) : null}
      </legend>
      {children}
    </fieldset>
  );
}

// ── result rendering ─────────────────────────────────────────────────────────

function ResultPanel({
  job,
  running,
  jsonOn,
  resultView,
  setResultView,
}: {
  job: RunJobView | null;
  running: boolean;
  jsonOn: boolean;
  resultView: "json" | "raw";
  setResultView: (v: "json" | "raw") => void;
}) {
  const parsed = useMemo(() => {
    if (!job?.stdout) return null;
    const t = job.stdout.trim();
    if (!t.startsWith("{") && !t.startsWith("[")) return null;
    try {
      return JSON.parse(t) as unknown;
    } catch {
      return null;
    }
  }, [job?.stdout]);

  if (!job && !running) {
    return (
      <div className="flex h-full min-h-[16rem] flex-col items-center justify-center rounded-xl border border-dashed bg-card/50 p-8 text-center">
        <Play className="mb-3 size-8 text-muted-foreground/40" />
        <p className="text-muted-foreground text-sm">
          Configure the command and press <strong>Run skill</strong>. Output
          appears here live.
        </p>
      </div>
    );
  }

  const status = job?.status ?? "running";

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b bg-muted/40 px-4 py-2.5">
        <StatusPill status={status} />
        {job ? (
          <span className="text-muted-foreground text-xs">
            {(job.elapsedMs / 1000).toFixed(1)}s
          </span>
        ) : null}
        {job && job.exitCode !== null ? (
          <span className="text-muted-foreground text-xs">
            exit {job.exitCode}
          </span>
        ) : null}
        {parsed != null ? (
          <div className="ml-auto flex overflow-hidden rounded-md border text-xs">
            <ViewToggle
              active={resultView === "json"}
              onClick={() => setResultView("json")}
            >
              JSON
            </ViewToggle>
            <ViewToggle
              active={resultView === "raw"}
              onClick={() => setResultView("raw")}
            >
              Raw
            </ViewToggle>
          </div>
        ) : null}
      </div>

      {job?.command ? (
        <div className="border-b px-4 py-2">
          <code className="block overflow-x-auto whitespace-pre font-mono text-[0.75rem] text-muted-foreground">
            $ {job.command}
          </code>
        </div>
      ) : null}

      {job?.note ? (
        <p className="border-brand-orange/30 border-b bg-brand-orange/5 px-4 py-2 text-brand-orange text-xs">
          {job.note}
        </p>
      ) : null}

      <div className="max-h-[60vh] min-h-[8rem] overflow-auto">
        {parsed != null && resultView === "json" ? (
          <JsonTree data={parsed} />
        ) : job?.stdout ? (
          <pre className="overflow-x-auto p-4 font-mono text-[0.8125rem] text-foreground leading-relaxed">
            {job.stdout}
          </pre>
        ) : running ? (
          <div className="flex items-center gap-2 p-4 text-muted-foreground text-sm">
            <Loader2 className="size-4 animate-spin" /> Waiting for output…
          </div>
        ) : (
          <p className="p-4 text-muted-foreground text-sm">No stdout.</p>
        )}
      </div>

      {job?.stderr ? (
        <details className="border-t" open={status === "failed"}>
          <summary className="cursor-pointer px-4 py-2 text-destructive text-xs">
            stderr ({job.stderr.split("\n").length} lines)
          </summary>
          <pre className="overflow-x-auto bg-destructive/5 p-4 font-mono text-[0.8125rem] text-destructive leading-relaxed">
            {job.stderr}
          </pre>
        </details>
      ) : null}
    </div>
  );
}

function StatusPill({ status }: { status: "running" | "done" | "failed" }) {
  if (status === "running")
    return (
      <span className="inline-flex items-center gap-1.5 font-medium text-brand-cyan-dark text-sm dark:text-brand-cyan">
        <Loader2 className="size-4 animate-spin" /> Running
      </span>
    );
  if (status === "done")
    return (
      <span className="inline-flex items-center gap-1.5 font-medium text-emerald-600 text-sm dark:text-emerald-400">
        <CheckCircle2 className="size-4" /> Done
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 font-medium text-destructive text-sm">
      <XCircle className="size-4" /> Failed
    </span>
  );
}

function ViewToggle({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-2.5 py-1 font-medium transition-colors",
        active
          ? "bg-brand-navy text-brand-cream dark:bg-brand-cream dark:text-brand-navy"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
