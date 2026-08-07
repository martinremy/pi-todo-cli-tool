import type { TodoAction, TodoParams, TodoStatus } from "./todo.ts";

const ACTIONS: TodoAction[] = ["list", "add", "update", "done", "rm", "categories"];
const STATUSES: TodoStatus[] = ["todo", "inprogress", "waiting", "done"];

/** Flag keys the parser recognises in `key=value` or `--key=value` form. */
const KNOWN_KEYS = new Set([
  "category",
  "due",
  "desc",
  "description",
  "status",
  "recurrence",
  "name",
  "id",
  "from",
  "to",
  "force",
  "all",
  "overdue",
]);

/** Keys that act as boolean flags (bare `--all`, `all`, etc.). */
const BOOL_KEYS = new Set(["all", "overdue", "force"]);

/**
 * Resolve a date value (`due`, `from`, `to`) to `YYYY-MM-DD`.
 *
 * Accepts:
 *  - `YYYY-MM-DD` (passed through)
 *  - `today` / `tomorrow`
 *  - relative offsets from today: `Nd`, `Nw`, `Nm`, `Ny` (e.g. `3d`, `1w`, `2m`, `1y`)
 *
 * Anything else is returned unchanged so the `todo` CLI can reject it with a
 * clear message rather than the extension silently guessing.
 */
export function resolveDue(value: string): string {
  const v = value.trim();
  if (!v) return v;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;

  const now = new Date();
  const lower = v.toLowerCase();
  if (lower === "today") return fmt(now);
  if (lower === "tomorrow") return fmt(addDays(now, 1));

  const m = /^(\d+)\s*(d|w|m|y)$/.exec(lower);
  if (m) {
    const n = Number(m[1]);
    switch (m[2]) {
      case "d":
        return fmt(addDays(now, n));
      case "w":
        return fmt(addDays(now, n * 7));
      case "m":
        return fmt(addMonths(now, n));
      case "y":
        return fmt(addMonths(now, n * 12));
    }
  }
  return v;
}

function fmt(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function addMonths(d: Date, n: number): Date {
  const r = new Date(d);
  r.setMonth(r.getMonth() + n);
  return r;
}

/**
 * Split a command argument string into shell-like tokens, honouring single and
 * double quotes and backslash escapes inside quoted segments.
 */
export function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  while (i < input.length) {
    while (i < input.length && /\s/.test(input[i])) i++;
    if (i >= input.length) break;

    let buf = "";
    while (i < input.length && !/\s/.test(input[i])) {
      const ch = input[i];
      if (ch === '"' || ch === "'") {
        // A quoted segment embedded in a token (e.g. desc="weekly shop").
        const quote = ch;
        i++;
        while (i < input.length && input[i] !== quote) {
          if (input[i] === "\\" && i + 1 < input.length) {
            buf += input[i + 1];
            i += 2;
          } else {
            buf += input[i];
            i++;
          }
        }
        i++; // closing quote
      } else {
        buf += ch;
        i++;
      }
    }
    tokens.push(buf)
  }
  return tokens;
}

function parseStatus(v: string | undefined): TodoStatus | undefined {
  if (v === undefined) return undefined;
  if (!STATUSES.includes(v as TodoStatus)) {
    throw new Error(
      `invalid status "${v}". Expected one of: ${STATUSES.join(", ")}.`,
    );
  }
  return v as TodoStatus;
}

/**
 * Parse the raw string a user typed after `/todo` into {@link TodoParams}.
 *
 * Grammar (first token is the action):
 *  - `list [--all] [--overdue] [category=X] [status=X] [from=D] [to=D]`
 *  - `add <name...> [due=D] [category=X] [desc=X] [recurrence=X]`
 *  - `update <id> [name=X] [status=X] [due=D] [category=X] [desc=X] [recurrence=X]`
 *  - `done <id>`
 *  - `rm <id>` (force is always applied — the CLI runs non-interactively here)
 *  - `categories`
 *
 * `<name...>` is every leftover token that is not a recognised `key=value`
 * flag, so `/todo add buy milk due=tomorrow` parses `name="buy milk"`. Quote
 * multi-word values that contain `=` or known flag names to be safe.
 *
 * An empty input defaults to `list`.
 */
export function parseCommand(input: string): TodoParams {
  const raw = input.trim();
  if (!raw) return { action: "list" };

  const tokens = tokenize(raw);
  const actionTok = tokens[0];
  const action = actionTok.toLowerCase() as TodoAction;
  if (!ACTIONS.includes(action)) {
    throw new Error(
      `unknown action "${actionTok}". Expected one of: ${ACTIONS.join(", ")}.`,
    );
  }

  const flags: Record<string, string> = {};
  const positionals: string[] = [];
  for (let idx = 1; idx < tokens.length; idx++) {
    const tok = tokens[idx];
    if (tok === "--all" || tok === "--overdue") {
      flags[tok.slice(2)] = "true";
      continue;
    }
    const eq = tok.indexOf("=");
    const key = eq !== -1 ? tok.slice(0, eq) : tok;
    const stripped = key.startsWith("--") ? key.slice(2) : key;
    if (eq !== -1 && KNOWN_KEYS.has(stripped)) {
      flags[stripped] = tok.slice(eq + 1);
    } else if (eq === -1 && BOOL_KEYS.has(stripped)) {
      flags[stripped] = "true";
    } else {
      positionals.push(tok);
    }
  }

  const bool = (k: string) => flags[k] === "true" || flags[k] === "1";
  const str = (k: string) => (flags[k] !== undefined ? flags[k] : undefined);
  const date = (k: string) => {
    const v = str(k);
    return v !== undefined ? resolveDue(v) : undefined;
  };

  // Build the params object, dropping keys whose value is undefined so callers
  // (and tests) see a minimal object, matching how the old tool received only
  // the fields the caller actually provided.
  const compact = (obj: Record<string, unknown>): TodoParams => {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) if (v !== undefined) out[k] = v;
    return out as unknown as TodoParams;
  };

  switch (action) {
    case "list":
      return compact({
        action: "list",
        all: bool("all") || undefined,
        overdue: bool("overdue") || undefined,
        category: str("category"),
        status: parseStatus(str("status")),
        from: date("from"),
        to: date("to"),
      });
    case "add": {
      const name = str("name") ?? positionals.join(" ");
      return compact({
        action: "add",
        name,
        category: str("category"),
        due: date("due"),
        description: str("desc") ?? str("description"),
        recurrence: str("recurrence"),
      });
    }
    case "update": {
      const idFlag = str("id");
      const nameFlag = str("name");
      let id: string | undefined;
      let name: string | undefined;
      if (idFlag !== undefined) {
        id = idFlag;
        name = nameFlag ?? (positionals.length ? positionals.join(" ") : undefined);
      } else {
        id = positionals[0];
        name = nameFlag ?? (positionals.length > 1 ? positionals.slice(1).join(" ") : undefined);
      }
      return compact({
        action: "update",
        id,
        name,
        description: str("desc") ?? str("description"),
        category: str("category"),
        status: parseStatus(str("status")),
        due: date("due"),
        recurrence: str("recurrence"),
      });
    }
    case "done":
      return compact({ action: "done", id: str("id") ?? positionals[0] });
    case "rm":
      // The CLI is invoked non-interactively; always force so it never hangs
      // waiting for a confirmation prompt.
      return compact({ action: "rm", id: str("id") ?? positionals[0], force: true });
    case "categories":
      return { action: "categories" };
  }
}
