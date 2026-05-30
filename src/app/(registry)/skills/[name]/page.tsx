import { ArrowLeft, ExternalLink, KeyRound, Terminal } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import type { CodeFile } from "@/components/skills/code-view";
import { SkillTabs } from "@/components/skills/skill-tabs";
import { Badge } from "@/components/ui/badge";
import { introspectSkill } from "@/lib/introspect";
import { categoryFor } from "@/lib/skill-categories";
import { getSkill, readSkillFileText } from "@/lib/skills";

export const dynamic = "force-dynamic";

const SOURCE_BASE = "https://github.com/thecolab-ai/.skills/tree/main/skills";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ name: string }>;
}): Promise<Metadata> {
  const { name } = await params;
  const skill = getSkill(name);
  return { title: skill ? skill.name : "Skill not found" };
}

export default async function SkillPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const skill = getSkill(name);
  if (!skill) notFound();

  const [introspection, files] = await Promise.all([
    introspectSkill(name).catch(() => null),
    Promise.resolve(
      skill.files.map((f): CodeFile => {
        let content = "";
        try {
          content = readSkillFileText(name, f.rel);
        } catch (e) {
          content = `# could not read file: ${e instanceof Error ? e.message : "error"}`;
        }
        return { ...f, content };
      }),
    ),
  ]);

  const category = categoryFor(name);
  const CatIcon = category.icon;

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 md:px-10">
      {/* Breadcrumb / back */}
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1.5 text-muted-foreground text-sm hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> All skills
      </Link>

      {/* Header */}
      <header className="mb-8 flex flex-col gap-4">
        <div className="flex items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-indigo to-brand-cyan text-brand-white shadow-sm">
            <CatIcon className="size-6" />
          </span>
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-bold font-mono text-2xl text-foreground tracking-tight md:text-3xl">
                {skill.name}
              </h1>
              <Link href={`/#cat-${category.id}`}>
                <Badge variant="secondary" className="font-normal">
                  {category.label}
                </Badge>
              </Link>
              {skill.keyGated ? (
                <Badge
                  variant="outline"
                  className="gap-1 border-brand-orange/30 text-brand-orange"
                >
                  <KeyRound className="size-3" /> Key required
                </Badge>
              ) : null}
            </div>
            <p className="max-w-3xl text-muted-foreground leading-relaxed">
              {skill.description}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-muted-foreground text-sm">
          <span className="inline-flex items-center gap-1.5">
            <Terminal className="size-4" />
            {skill.subcommandCount}{" "}
            {skill.subcommandCount === 1 ? "command" : "commands"}
          </span>
          <a
            href={`${SOURCE_BASE}/${skill.name}`}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1.5 hover:text-foreground"
          >
            <ExternalLink className="size-4" /> Source on GitHub
          </a>
        </div>
      </header>

      <SkillTabs
        skillMarkdown={skill.skillMarkdown}
        files={files}
        introspection={
          introspection ?? {
            globalOptions: [],
            subcommands: [],
            hasSubcommands: false,
            source: "fallback",
          }
        }
        runnerSkill={{
          name: skill.name,
          envVars: skill.envVars,
          keyGated: skill.keyGated,
        }}
      />
    </div>
  );
}
