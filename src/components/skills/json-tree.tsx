"use client";

import { ChevronRight } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

function Primitive({ value }: { value: unknown }) {
  if (value === null)
    return <span className="text-muted-foreground">null</span>;
  switch (typeof value) {
    case "string":
      return (
        <span className="break-words text-brand-cyan-dark dark:text-brand-cyan">
          &quot;{value}&quot;
        </span>
      );
    case "number":
      return (
        <span className="text-brand-indigo dark:text-sky-300">
          {String(value)}
        </span>
      );
    case "boolean":
      return <span className="text-brand-orange">{String(value)}</span>;
    default:
      return <span>{String(value)}</span>;
  }
}

function Node({
  name,
  value,
  depth,
  isLast,
}: {
  name?: string;
  value: unknown;
  depth: number;
  isLast: boolean;
}) {
  const isObject = value !== null && typeof value === "object";
  const [open, setOpen] = useState(depth < 2);

  const keyLabel = name !== undefined && (
    <span className="text-foreground/70">{name}: </span>
  );

  if (!isObject) {
    return (
      <div className="flex">
        <span className="whitespace-pre">
          {keyLabel}
          <Primitive value={value} />
          {isLast ? "" : ","}
        </span>
      </div>
    );
  }

  const entries: [string, unknown][] = Array.isArray(value)
    ? value.map((v, i) => [String(i), v])
    : Object.entries(value as Record<string, unknown>);
  const open_b = Array.isArray(value) ? "[" : "{";
  const close_b = Array.isArray(value) ? "]" : "}";
  const summary = Array.isArray(value)
    ? `${entries.length} item${entries.length === 1 ? "" : "s"}`
    : `${entries.length} key${entries.length === 1 ? "" : "s"}`;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-1 text-left hover:bg-muted/50"
      >
        <ChevronRight
          className={cn(
            "size-3.5 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-90",
          )}
        />
        <span className="whitespace-pre">
          {keyLabel}
          {open_b}
          {!open && (
            <span className="text-muted-foreground">
              {" "}
              {summary} {close_b}
              {isLast ? "" : ","}
            </span>
          )}
        </span>
      </button>
      {open && (
        <div className="ml-4 border-border/60 border-l pl-3">
          {entries.map(([k, v], i) => (
            <Node
              key={k}
              name={Array.isArray(value) ? undefined : k}
              value={v}
              depth={depth + 1}
              isLast={i === entries.length - 1}
            />
          ))}
          <div className="whitespace-pre">
            {close_b}
            {isLast ? "" : ","}
          </div>
        </div>
      )}
    </div>
  );
}

export function JsonTree({ data }: { data: unknown }) {
  return (
    <div className="overflow-x-auto p-3 font-mono text-[0.8125rem] leading-relaxed">
      <Node value={data} depth={0} isLast />
    </div>
  );
}
