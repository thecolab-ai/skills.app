"use client";

import { Check, Copy, FileCode, FileText } from "lucide-react";
import { useMemo, useState } from "react";

import { CodeBlock } from "@/components/skills/code-block";
import { cn } from "@/lib/utils";

export interface CodeFile {
  name: string;
  rel: string;
  kind: "script" | "reference" | "skill" | "other";
  language: "python" | "markdown" | "text";
  content: string;
}

export function CodeView({ files }: { files: CodeFile[] }) {
  const [selected, setSelected] = useState(files[0]?.rel ?? "");
  const current = files.find((f) => f.rel === selected) ?? files[0];

  const groups = useMemo(() => {
    return [
      { label: "scripts", items: files.filter((f) => f.kind === "script") },
      {
        label: "references",
        items: files.filter((f) => f.kind === "reference"),
      },
      {
        label: "other",
        items: files.filter(
          (f) => f.kind !== "script" && f.kind !== "reference",
        ),
      },
    ].filter((g) => g.items.length > 0);
  }, [files]);

  if (!current) {
    return (
      <p className="py-12 text-center text-muted-foreground">
        No source files to display.
      </p>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-[14rem_1fr]">
      {/* File tree */}
      <aside className="flex flex-col gap-4 md:border-r md:pr-4">
        {groups.map((g) => (
          <div key={g.label}>
            <p className="mb-1.5 px-2 font-mono text-muted-foreground text-xs uppercase tracking-wider">
              {g.label}/
            </p>
            <ul className="flex flex-col gap-0.5">
              {g.items.map((f) => {
                const Icon = f.language === "python" ? FileCode : FileText;
                const active = f.rel === current.rel;
                return (
                  <li key={f.rel}>
                    <button
                      type="button"
                      onClick={() => setSelected(f.rel)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left font-mono text-sm transition-colors",
                        active
                          ? "bg-accent font-medium text-accent-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <Icon className="size-4 shrink-0" />
                      <span className="truncate">{f.name}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </aside>

      {/* Viewer */}
      <div className="min-w-0 overflow-hidden rounded-lg border bg-card">
        <div className="flex items-center justify-between border-b bg-muted/40 px-3 py-2">
          <span className="font-mono text-muted-foreground text-xs">
            {current.rel}
          </span>
          <div className="flex items-center gap-3 text-muted-foreground text-xs">
            <span>{current.content.split("\n").length} lines</span>
            <CopyButton text={current.content} />
          </div>
        </div>
        <div className="max-h-[70vh] overflow-auto">
          {current.language === "markdown" ? (
            <CodeBlock
              code={current.content}
              language="markdown"
              showLineNumbers
            />
          ) : (
            <CodeBlock
              code={current.content}
              language={current.language}
              showLineNumbers
            />
          )}
        </div>
      </div>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      className="inline-flex items-center gap-1 hover:text-foreground"
    >
      {copied ? (
        <Check className="size-3.5 text-brand-cyan-dark" />
      ) : (
        <Copy className="size-3.5" />
      )}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
