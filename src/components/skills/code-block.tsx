"use client";

import { useEffect, useState } from "react";
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
import bash from "react-syntax-highlighter/dist/esm/languages/prism/bash";
import json from "react-syntax-highlighter/dist/esm/languages/prism/json";
import markdown from "react-syntax-highlighter/dist/esm/languages/prism/markdown";
import python from "react-syntax-highlighter/dist/esm/languages/prism/python";
import {
  oneDark,
  oneLight,
} from "react-syntax-highlighter/dist/esm/styles/prism";

SyntaxHighlighter.registerLanguage("python", python);
SyntaxHighlighter.registerLanguage("markdown", markdown);
SyntaxHighlighter.registerLanguage("bash", bash);
SyntaxHighlighter.registerLanguage("json", json);

const ALIASES: Record<string, string> = {
  py: "python",
  python: "python",
  md: "markdown",
  markdown: "markdown",
  sh: "bash",
  bash: "bash",
  shell: "bash",
  json: "json",
};

/** Reads the manual `.dark` class and tracks changes. */
function useIsDark(): boolean {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const el = document.documentElement;
    const update = () => setDark(el.classList.contains("dark"));
    update();
    const obs = new MutationObserver(update);
    obs.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

export function CodeBlock({
  code,
  language = "text",
  showLineNumbers = false,
}: {
  code: string;
  language?: string;
  showLineNumbers?: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  const dark = useIsDark();
  useEffect(() => setMounted(true), []);

  const lang = ALIASES[language] ?? "text";

  // Pre-mount (and SSR): a neutral <pre> so server/client markup matches, then
  // upgrade to the themed highlighter on the client.
  if (!mounted) {
    return (
      <pre className="overflow-x-auto bg-muted/40 p-4 font-mono text-[0.8125rem] text-foreground leading-relaxed">
        <code>{code}</code>
      </pre>
    );
  }

  return (
    <SyntaxHighlighter
      language={lang}
      style={dark ? oneDark : oneLight}
      showLineNumbers={showLineNumbers}
      wrapLongLines={false}
      customStyle={{
        margin: 0,
        background: "transparent",
        padding: "1rem",
        fontSize: "0.8125rem",
        lineHeight: 1.65,
      }}
      codeTagProps={{
        style: { fontFamily: "var(--font-mono), monospace" },
      }}
    >
      {code}
    </SyntaxHighlighter>
  );
}
