import { cn } from "@/lib/utils";

/** The three-node "collaboration network" mark, filled with the brand gradient. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("size-7", className)}
      role="img"
      aria-label="thecolab.ai"
    >
      <defs>
        <linearGradient id="tc-mark" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2E4057" />
          <stop offset="100%" stopColor="#0EA5E9" />
        </linearGradient>
      </defs>
      <circle cx="8" cy="16" r="5" fill="url(#tc-mark)" />
      <circle cx="24" cy="8" r="4" fill="url(#tc-mark)" />
      <circle cx="24" cy="24" r="4" fill="url(#tc-mark)" />
      <line
        x1="12"
        y1="14"
        x2="20"
        y2="9"
        stroke="url(#tc-mark)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="12"
        y1="18"
        x2="20"
        y2="23"
        stroke="url(#tc-mark)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="24"
        y1="12"
        x2="24"
        y2="20"
        stroke="url(#tc-mark)"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Lowercase wordmark: `thecolab` navy + `.ai` cyan (cyan-dark for contrast). */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-bold font-serif tracking-tight", className)}>
      <span className="text-brand-navy dark:text-brand-cream">thecolab</span>
      <span className="text-brand-cyan-dark dark:text-brand-cyan">.ai</span>
    </span>
  );
}

export function BrandLogo({
  className,
  subtitle = true,
}: {
  className?: string;
  subtitle?: boolean;
}) {
  return (
    <span className={cn("flex min-w-0 items-center gap-2", className)}>
      <BrandMark className="size-7 shrink-0" />
      <span className="flex min-w-0 flex-col leading-none">
        <Wordmark className="truncate text-lg" />
        {subtitle ? (
          <span className="truncate text-[0.7rem] text-muted-foreground tracking-wide">
            Skills Explorer
          </span>
        ) : null}
      </span>
    </span>
  );
}
