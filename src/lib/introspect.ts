// CLI introspection: discover a skill's subcommands and arguments by parsing
// `python3 cli.py --help` (and each subcommand's --help) at request time.
//
// The parser below is a direct port of the reference implementation that was
// validated against all 54 skills (252 subcommands). A static corpus generated
// by that same logic ships as a fallback for when spawning python fails.

import { runHelp } from "@/lib/skill-exec";
import corpus from "@/lib/skills-introspection.json";
import type {
  CliIntrospection,
  CliOption,
  CliPositional,
  CliSubcommand,
} from "@/lib/skills-types";

const OPTIONS_HDR = /^(options|optional arguments):$/i;
const POS_HDR = /^positional arguments:$/i;

interface ParsedArgs {
  usage: string;
  positionals: CliPositional[];
  options: CliOption[];
  hasJson: boolean;
}

function parseArgs(helpText: string): ParsedArgs {
  const lines = helpText.split("\n");

  // Usage block (may wrap across indented lines).
  const usageLines: string[] = [];
  let collecting = false;
  for (const ln of lines) {
    if (ln.toLowerCase().startsWith("usage:")) {
      collecting = true;
      usageLines.push(ln);
      continue;
    }
    if (collecting) {
      const s = ln.trim();
      if (s === "") collecting = false;
      else if (/^\s+\S/.test(ln) && !POS_HDR.test(s) && !OPTIONS_HDR.test(s))
        usageLines.push(ln);
      else collecting = false;
    }
  }
  const usage = usageLines
    .map((x) => x.trim())
    .join(" ")
    .replace(/\s+/g, " ");

  const positionals: CliPositional[] = [];
  const options: CliOption[] = [];
  let section: "pos" | "opt" | null = null;

  for (const ln of lines) {
    const s = ln.trim();
    if (POS_HDR.test(s)) {
      section = "pos";
      continue;
    }
    if (OPTIONS_HDR.test(s)) {
      section = "opt";
      continue;
    }
    if (section === "pos") {
      // A positional NAME sits at the shallow 2-space entry indent; wrapped help
      // continuation lines sit at the deep help column, so cap the indent to
      // avoid capturing a capitalised continuation word (e.g. "Road") as a name.
      const mm = ln.match(/^ {2,4}([A-Za-z0-9][A-Za-z0-9_-]*)(?:\s{2,}(.*))?$/);
      if (mm && !s.startsWith("-") && !s.startsWith("{")) {
        positionals.push({
          name: mm[1],
          help: (mm[2] ?? "").trim(),
          required: false,
        });
      }
    } else if (section === "opt") {
      const mm = ln.match(/^\s{2,}(-[^\s].*)$/);
      if (mm) {
        const body = mm[1];
        const parts = body.split(/\s{2,}/);
        const flagpart = parts[0].trim();
        const helptext =
          parts.length > 1 ? parts.slice(1).join("  ").trim() : "";

        let choices: string[] | null = null;
        let takesValue = false;
        let metavar: string | null = null;
        let toks: string[];

        const cm = flagpart.match(/\{([^}]+)\}/);
        if (cm) {
          choices = cm[1].split(",");
          takesValue = true;
          toks = flagpart
            .slice(0, cm.index)
            .split(/[,\s]+/)
            .filter(Boolean);
        } else {
          toks = flagpart.split(/[,\s]+/).filter(Boolean);
          const metatoks = toks.filter((t) => !t.startsWith("-"));
          if (metatoks.length) {
            takesValue = true;
            metavar = metatoks.join(",");
          }
        }
        const flagtoks = toks.filter((t) => t.startsWith("-"));
        const flag =
          flagtoks.find((t) => t.startsWith("--")) ?? flagtoks[0] ?? "";
        if (flag === "-h" || flag === "--help" || flag === "") continue;
        options.push({ flag, takesValue, metavar, choices, help: helptext });
      }
    }
  }

  for (const p of positionals) {
    // required if ANY occurrence in usage is not directly preceded by '['
    const re = new RegExp(`(?<![\\w-])${escapeRe(p.name)}(?![\\w-])`, "g");
    let m: RegExpExecArray | null;
    let required = false;
    // biome-ignore lint/suspicious/noAssignInExpressions: standard regex iteration
    while ((m = re.exec(usage)) !== null) {
      if (usage[m.index - 1] !== "[") {
        required = true;
        break;
      }
    }
    p.required = required;
  }

  const hasJson = options.some((o) => o.flag === "--json");
  return { usage, positionals, options, hasJson };
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseSubcommands(topHelp: string): {
  order: string[];
  summaries: Record<string, string>;
} {
  const lines = topHelp.split("\n");
  let inPos = false;
  let order: string[] = [];
  const summaries: Record<string, string> = {};
  let cur: string | null = null;

  for (const ln of lines) {
    const s = ln.trim();
    if (POS_HDR.test(s)) {
      inPos = true;
      continue;
    }
    if (OPTIONS_HDR.test(s)) {
      inPos = false;
      continue;
    }
    if (inPos) {
      const bm = ln.match(/^\s{2,}\{([a-z0-9_,-]+)\}\s*$/);
      if (bm && order.length === 0) {
        order = bm[1].split(",").filter(Boolean);
        continue;
      }
      const mm = ln.match(/^\s{2,}([a-z0-9][a-z0-9_-]*)\s{2,}(.*)$/);
      if (mm && order.includes(mm[1])) {
        cur = mm[1];
        summaries[cur] = mm[2].trim();
      } else if (cur && /^\s{6,}\S/.test(ln)) {
        summaries[cur] += ` ${ln.trim()}`;
      }
    }
  }
  for (const o of order) if (!(o in summaries)) summaries[o] = "";
  return { order, summaries };
}

/** Live introspection: spawn `--help` for the CLI and each subcommand. */
export async function introspectLive(name: string): Promise<CliIntrospection> {
  const top = await runHelp(name, []);
  if (!top) throw new Error("no --help output");
  const { order, summaries } = parseSubcommands(top);

  if (order.length === 0) {
    // Single-command CLI.
    const a = parseArgs(top);
    return {
      globalOptions: [],
      hasSubcommands: false,
      source: "live",
      subcommands: [{ name: "(default)", summary: "", ...a }],
    };
  }

  const globalOptions = parseArgs(top).options;
  const subs = await Promise.all(
    order.map(async (sub): Promise<CliSubcommand> => {
      const h = await runHelp(name, [sub]);
      const a = parseArgs(h);
      return { name: sub, summary: summaries[sub] ?? "", ...a };
    }),
  );
  return {
    globalOptions,
    hasSubcommands: true,
    source: "live",
    subcommands: subs,
  };
}

type CorpusSub = Omit<CliSubcommand, "name"> & { name?: string };
type CorpusEntry = {
  globalOptions?: CliOption[];
  subcommands: Record<string, CorpusSub>;
};

/** Static fallback from the pre-generated corpus. */
export function introspectFromCorpus(name: string): CliIntrospection | null {
  const entry = (corpus as Record<string, CorpusEntry>)[name];
  if (!entry) return null;
  const subNames = Object.keys(entry.subcommands);
  const hasSubcommands = !(
    subNames.length === 1 && subNames[0] === "(default)"
  );
  const subcommands: CliSubcommand[] = subNames.map((sn) => {
    const s = entry.subcommands[sn];
    return {
      name: sn,
      summary: s.summary ?? "",
      usage: s.usage ?? "",
      positionals: s.positionals ?? [],
      options: s.options ?? [],
      hasJson: s.hasJson ?? false,
    };
  });
  return {
    globalOptions: hasSubcommands ? (entry.globalOptions ?? []) : [],
    hasSubcommands,
    source: "fallback",
    subcommands,
  };
}

const globalForCache = globalThis as unknown as {
  __introspectCache?: Map<string, CliIntrospection>;
};
globalForCache.__introspectCache ??= new Map();
const cache: Map<string, CliIntrospection> = globalForCache.__introspectCache;

/** Live introspection with caching and a corpus fallback. */
export async function introspectSkill(name: string): Promise<CliIntrospection> {
  const cached = cache.get(name);
  if (cached) return cached;
  try {
    const live = await introspectLive(name);
    cache.set(name, live);
    return live;
  } catch {
    const fallback = introspectFromCorpus(name);
    if (fallback) return fallback;
    throw new Error(`Unable to introspect skill: ${name}`);
  }
}
