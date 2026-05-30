import { SkillsBrowser } from "@/components/skills/skills-browser";
import { listSkills } from "@/lib/skills";

export const dynamic = "force-dynamic";

export default function Home() {
  const skills = listSkills();
  const keyed = skills.filter((s) => s.keyGated).length;
  const categoryCount = new Set(skills.map((s) => s.category)).size;

  return (
    <div className="w-full">
      {/* Hero — warm cream, serif headline, signature gradient accent */}
      <section className="relative overflow-hidden border-b">
        <div
          className="pointer-events-none absolute top-[-30%] left-[10%] size-[420px] rounded-full bg-brand-indigo/10 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute top-[-20%] right-[8%] size-[420px] rounded-full bg-brand-cyan/10 blur-3xl"
          aria-hidden
        />
        <div className="relative mx-auto max-w-6xl px-5 pt-14 pb-10 md:px-10 md:pt-20 md:pb-14">
          <p className="mb-3 font-medium text-brand-cyan-dark text-sm tracking-wide dark:text-brand-cyan">
            thecolab.ai · AI-Native Design System
          </p>
          <h1 className="max-w-3xl font-bold font-serif text-4xl text-brand-navy leading-[1.05] tracking-tight md:text-6xl dark:text-brand-cream">
            New Zealand skills,{" "}
            <span className="brand-gradient-text">built together</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted-foreground leading-relaxed">
            Browse, read, and run thecolab.ai&apos;s {skills.length} Claude Code
            skills — each a self-contained Python CLI over a free, public New
            Zealand data source. Inspect the code, then run it live in your
            browser. No fluff, just practical tools that actually work.
          </p>
          <div className="mt-6 flex flex-wrap gap-2 text-muted-foreground text-sm">
            <Stat value={skills.length} label="skills" />
            <Stat value={categoryCount} label="categories" />
            <Stat value={keyed} label="key-gated" />
            <Stat value="stdlib" label="Python 3, zero deps" />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-5 py-8 md:px-10">
        <SkillsBrowser skills={skills} />
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <span className="inline-flex items-baseline gap-1.5 rounded-full border bg-card px-3 py-1">
      <span className="font-semibold text-brand-indigo dark:text-brand-cyan">
        {value}
      </span>
      <span>{label}</span>
    </span>
  );
}
