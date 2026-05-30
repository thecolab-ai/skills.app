"use client";

import { BookOpen, FileCode2, Terminal } from "lucide-react";

import { type CodeFile, CodeView } from "@/components/skills/code-view";
import { MarkdownView } from "@/components/skills/markdown-view";
import { RunnerPanel } from "@/components/skills/runner-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CliIntrospection, SkillEnvVar } from "@/lib/skills-types";

export function SkillTabs({
  skillMarkdown,
  files,
  introspection,
  runnerSkill,
}: {
  skillMarkdown: string;
  files: CodeFile[];
  introspection: CliIntrospection;
  runnerSkill: { name: string; envVars: SkillEnvVar[]; keyGated: boolean };
}) {
  return (
    <Tabs defaultValue="overview" className="w-full gap-6">
      <TabsList className="h-auto w-full justify-start gap-1 rounded-lg bg-muted/60 p-1 sm:w-auto">
        <TabsTrigger value="overview" className="gap-1.5">
          <BookOpen className="size-4" /> Overview
        </TabsTrigger>
        <TabsTrigger value="code" className="gap-1.5">
          <FileCode2 className="size-4" /> Code
          <span className="ml-0.5 text-muted-foreground text-xs">
            {files.length}
          </span>
        </TabsTrigger>
        <TabsTrigger value="run" className="gap-1.5">
          <Terminal className="size-4" /> Run
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <div className="rounded-xl border bg-card p-6 md:p-8">
          <MarkdownView markdown={skillMarkdown} />
        </div>
      </TabsContent>

      <TabsContent value="code">
        <CodeView files={files} />
      </TabsContent>

      <TabsContent value="run">
        <RunnerPanel skill={runnerSkill} introspection={introspection} />
      </TabsContent>
    </Tabs>
  );
}
