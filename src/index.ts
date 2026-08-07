import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { buildArgs } from "./todo.ts";
import { parseCommand } from "./command.ts";

export default function (pi: ExtensionAPI) {
  pi.registerCommand("todo", {
    description:
      "Manage your personal todo list: /todo list [--all] [--overdue] | add <name> [due=D] [category=X] | update <id> [...] | done <id> | rm <id> | categories",
    getArgumentCompletions: (prefix) => {
      const actions = ["list", "add", "update", "done", "rm", "categories"];
      const p = prefix.trimStart();
      const hits = actions.filter((a) => a.startsWith(p));
      return hits.length ? hits.map((value) => ({ value, label: value })) : null;
    },
    handler: async (args, ctx) => {
      let cliArgs: string[];
      try {
        const params = parseCommand(args ?? "");
        cliArgs = buildArgs(params);
      } catch (err) {
        ctx.ui.notify(err instanceof Error ? err.message : String(err), "error");
        return;
      }

      const result = await pi.exec("todo", cliArgs, { signal: ctx.signal });
      if (result.killed) {
        ctx.ui.notify(`todo ${cliArgs[0]} was cancelled`, "warning");
        return;
      }
      if (result.code !== 0) {
        ctx.ui.notify(
          `todo ${cliArgs[0]} failed (exit ${result.code}): ${result.stderr || result.stdout}`.trim(),
          "error",
        );
        return;
      }
      const out = result.stdout.trim();
      ctx.ui.notify(out || `todo ${cliArgs[0]} completed.`, "info");
    },
  });
}
