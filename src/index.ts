import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { StringEnum } from "@earendil-works/pi-ai";
import { Type } from "typebox";
import { buildArgs, type TodoParams } from "./todo.ts";

export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: "todo",
    label: "Todo",
    description:
      "Manage the user's personal todo list via the `todo` CLI. " +
      "Actions: list (JSONL output, one JSON object per line with fields id, name, description, category, status, created, updated, due, recurrence), " +
      "add, update, done (marks complete; recurring items spawn a new item), rm (prefer done over rm), categories (list category names).",
    promptSnippet: "Manage the user's personal todo list (list/add/update/done/rm/categories)",
    promptGuidelines: [
      "Use the todo tool when the user asks to add, list, update, complete, or remove personal todo items.",
      "Run the todo tool with action \"list\" before update, done, or rm to obtain the item's full 26-char ULID for the id parameter.",
      "Pass due/from/to dates to the todo tool in YYYY-MM-DD format; convert relative dates (\"next Friday\", \"in 3 days\") before calling.",
      "Always set force to true when calling the todo tool with action \"rm\".",
    ],
    parameters: Type.Object({
      action: StringEnum(["list", "add", "update", "done", "rm", "categories"] as const),
      id: Type.Optional(
        Type.String({ description: "Full 26-char ULID of the item. Required for update, done, rm." }),
      ),
      name: Type.Optional(
        Type.String({ description: "Item name/title. Required for add; optional new value for update." }),
      ),
      description: Type.Optional(Type.String({ description: "Longer description text (add, update)." })),
      category: Type.Optional(Type.String({ description: "Category label (add, update); filter for list." })),
      status: Type.Optional(
        StringEnum(["todo", "inprogress", "waiting", "done"] as const),
      ),
      due: Type.Optional(Type.String({ description: "Due date, YYYY-MM-DD (add, update)." })),
      recurrence: Type.Optional(
        Type.String({ description: "Recurrence interval like 1d, 7d, 2w, 1m, 1y (add, update)." }),
      ),
      all: Type.Optional(Type.Boolean({ description: "list: include done items." })),
      overdue: Type.Optional(Type.Boolean({ description: "list: only items past their due date." })),
      from: Type.Optional(Type.String({ description: "list: items due on/after this YYYY-MM-DD." })),
      to: Type.Optional(Type.String({ description: "list: items due on/before this YYYY-MM-DD." })),
      force: Type.Optional(Type.Boolean({ description: "rm: skip confirmation. Always set true." })),
    }),
    async execute(_toolCallId, params, signal, _onUpdate, _ctx) {
      const args = buildArgs(params as TodoParams);
      const result = await pi.exec("todo", args, { signal });
      if (result.killed) {
        throw new Error(`todo ${args[0]} was cancelled`);
      }
      if (result.code !== 0) {
        throw new Error(`todo ${args[0]} failed (exit ${result.code}): ${result.stderr || result.stdout}`);
      }
      const output = result.stdout.trim();
      return {
        content: [
          { type: "text", text: output || `todo ${args[0]} completed successfully (no output).` },
        ],
        details: { action: params.action, args },
      };
    },
  });
}