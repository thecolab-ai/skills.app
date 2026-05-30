"use client";

import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { CodeBlock } from "@/components/skills/code-block";

const components: Components = {
  h1: ({ children }) => (
    <h1 className="mt-8 mb-3 font-bold font-serif text-2xl text-foreground first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-8 mb-3 border-b pb-1.5 font-bold font-serif text-foreground text-xl first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-6 mb-2 font-semibold text-foreground text-lg">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="mt-4 mb-2 font-semibold text-foreground">{children}</h4>
  ),
  p: ({ children }) => (
    <p className="my-3 text-[0.95rem] text-foreground/90 leading-relaxed">
      {children}
    </p>
  ),
  ul: ({ children }) => (
    <ul className="my-3 ml-5 list-disc space-y-1.5 text-[0.95rem] text-foreground/90 marker:text-brand-cyan-dark">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="my-3 ml-5 list-decimal space-y-1.5 text-[0.95rem] text-foreground/90 marker:text-muted-foreground">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="font-medium text-brand-cyan-dark underline decoration-brand-cyan/40 underline-offset-2 hover:decoration-brand-cyan dark:text-brand-cyan"
    >
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-4 border-brand-cyan/50 border-l-4 bg-muted/40 py-1 pl-4 text-muted-foreground italic">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-6 border-border" />,
  table: ({ children }) => (
    <div className="my-4 overflow-x-auto rounded-lg border">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-muted/60">{children}</thead>,
  th: ({ children }) => (
    <th className="border-b px-3 py-2 text-left font-semibold text-foreground">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-b px-3 py-2 align-top text-foreground/90">
      {children}
    </td>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  code({ className, children }) {
    const match = /language-(\w+)/.exec(className ?? "");
    const text = String(children).replace(/\n$/, "");
    if (match) {
      return (
        <div className="my-4 overflow-hidden rounded-lg border bg-card">
          <CodeBlock code={text} language={match[1]} />
        </div>
      );
    }
    return (
      <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-brand-orange dark:text-brand-cyan">
        {children}
      </code>
    );
  },
};

export function MarkdownView({ markdown }: { markdown: string }) {
  return (
    <div className="max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
