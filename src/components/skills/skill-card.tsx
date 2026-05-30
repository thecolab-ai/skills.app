import { KeyRound, Terminal } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { categoryFor } from "@/lib/skill-categories";
import type { SkillSummary } from "@/lib/skills-types";

export function SkillCard({ skill }: { skill: SkillSummary }) {
  const Icon = categoryFor(skill.name).icon;
  return (
    <Link
      href={`/skills/${skill.name}`}
      className="group hover:-translate-y-0.5 flex h-full flex-col gap-3 rounded-xl border bg-card p-5 shadow-xs transition-all hover:border-brand-cyan/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-indigo to-brand-cyan text-brand-white shadow-sm">
          <Icon className="size-5" />
        </span>
        {skill.keyGated ? (
          <Badge
            variant="outline"
            className="gap-1 border-brand-orange/30 text-brand-orange"
            title="Requires an API key or token to run"
          >
            <KeyRound className="size-3" />
            Key
          </Badge>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <h3 className="font-mono font-semibold text-base text-foreground leading-tight">
          {skill.name}
        </h3>
        <p className="line-clamp-3 text-muted-foreground text-sm leading-relaxed">
          {skill.description}
        </p>
      </div>

      <div className="mt-auto flex items-center gap-1.5 pt-1 text-muted-foreground text-xs">
        <Terminal className="size-3.5" />
        <span>
          {skill.subcommandCount}{" "}
          {skill.subcommandCount === 1 ? "command" : "commands"}
        </span>
        <span
          className="ml-auto font-medium text-brand-cyan-dark opacity-0 transition-opacity group-hover:opacity-100 dark:text-brand-cyan"
          aria-hidden
        >
          Open →
        </span>
      </div>
    </Link>
  );
}
