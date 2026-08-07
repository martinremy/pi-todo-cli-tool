import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

/**
 * `/todo` slash command — a thin forwarder.
 *
 * The handler takes whatever natural language the user typed after `/todo`
 * and forwards it to the agent as a user message via `pi.sendUserMessage`.
 * The message explicitly requests the `todo-cli` skill so the
 * `using-superpowers` bootstrap reliably loads it before the agent acts.
 *
 * The agent then uses the `todo` CLI through bash to fulfil the request.
 */
export default function (pi: ExtensionAPI) {
  pi.registerCommand("todo", {
    description:
      "Manage your personal todo list with natural language: /todo what's on my list? | /todo add water the garden due in 3 days | /todo mark brushing teeth as complete",
    getArgumentCompletions: (prefix) => {
      const hints = [
        "list",
        "add",
        "update",
        "done",
        "rm",
        "categories",
        "what's",
        "show",
        "mark",
      ];
      const p = prefix.trimStart().toLowerCase();
      const hits = hints.filter((h) => h.startsWith(p));
      return hits.length
        ? hits.map((value) => ({ value, label: value }))
        : null;
    },
    handler: async (args, ctx) => {
      const input = (args ?? "").trim();
      const request = input || "list my todos";
      try {
        pi.sendUserMessage(
          `Invoke the todo-cli skill, then handle this personal todo request: ${request}`,
        );
      } catch (err) {
        ctx.ui.notify(
          `Failed to forward todo request: ${err instanceof Error ? err.message : String(err)}`,
          "error",
        );
      }
    },
  });
}
