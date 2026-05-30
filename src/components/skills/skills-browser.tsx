"use client";

import { Search, X } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";

import { SkillCard } from "@/components/skills/skill-card";
import { Input } from "@/components/ui/input";
import { CATEGORIES } from "@/lib/skill-categories";
import type { SkillSummary } from "@/lib/skills-types";
import { cn } from "@/lib/utils";

export function SkillsBrowser({ skills }: { skills: SkillSummary[] }) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<string | null>(null);
  const deferredQuery = useDeferredValue(query);

  const orderedCategories = useMemo(
    () => CATEGORIES.filter((c) => skills.some((s) => s.category === c.id)),
    [skills],
  );

  const filtered = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    return skills.filter((s) => {
      if (active && s.category !== active) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.categoryLabel.toLowerCase().includes(q)
      );
    });
  }, [skills, deferredQuery, active]);

  const grouped = useMemo(() => {
    return orderedCategories
      .map((c) => ({
        category: c,
        items: filtered.filter((s) => s.category === c.id),
      }))
      .filter((g) => g.items.length > 0);
  }, [orderedCategories, filtered]);

  return (
    <div className="flex flex-col gap-6">
      {/* Search + filter controls */}
      <div className="-mx-1 sticky top-0 z-10 flex flex-col gap-3 bg-background/85 px-1 py-3 backdrop-blur">
        <div className="relative">
          <Search className="-translate-y-1/2 absolute top-1/2 left-3 size-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search 54 skills — try “fuel”, “transport”, or “metservice”…"
            className="h-11 pl-9"
            aria-label="Search skills"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="-translate-y-1/2 absolute top-1/2 right-3 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <FilterChip active={active === null} onClick={() => setActive(null)}>
            All
            <span className="ml-1.5 opacity-60">{skills.length}</span>
          </FilterChip>
          {orderedCategories.map((c) => {
            const count = skills.filter((s) => s.category === c.id).length;
            return (
              <FilterChip
                key={c.id}
                active={active === c.id}
                onClick={() => setActive(active === c.id ? null : c.id)}
              >
                {c.label}
                <span className="ml-1.5 opacity-60">{count}</span>
              </FilterChip>
            );
          })}
        </div>
      </div>

      {grouped.length === 0 ? (
        <p className="py-16 text-center text-muted-foreground">
          No skills match “{query}”.
        </p>
      ) : (
        grouped.map(({ category, items }) => {
          const Icon = category.icon;
          return (
            <section
              key={category.id}
              id={`cat-${category.id}`}
              className="scroll-mt-24"
            >
              <div className="mb-3 flex items-baseline gap-3">
                <h2 className="flex items-center gap-2 font-bold font-serif text-foreground text-xl">
                  <Icon className="size-5 text-brand-cyan-dark dark:text-brand-cyan" />
                  {category.label}
                </h2>
                <span className="text-muted-foreground text-sm">
                  {category.blurb}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                {items.map((s) => (
                  <SkillCard key={s.name} skill={s} />
                ))}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}

function FilterChip({
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
        "inline-flex items-center rounded-full border px-3 py-1 font-medium text-sm transition-colors",
        active
          ? "border-transparent bg-brand-navy text-brand-cream dark:bg-brand-cream dark:text-brand-navy"
          : "bg-card text-muted-foreground hover:border-brand-cyan/40 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
