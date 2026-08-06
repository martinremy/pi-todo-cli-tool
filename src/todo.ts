export type TodoAction = "list" | "add" | "update" | "done" | "rm" | "categories";

export type TodoStatus = "todo" | "inprogress" | "waiting" | "done";

export interface TodoParams {
  action: TodoAction;
  /** Full 26-char ULID (update, done, rm). */
  id?: string;
  /** Item name/title (add; optional new value for update). */
  name?: string;
  /** Longer description text (add, update). */
  description?: string;
  /** Category label (add, update; filter for list). */
  category?: string;
  /** Status value (update; filter for list). */
  status?: TodoStatus;
  /** Due date YYYY-MM-DD (add, update). */
  due?: string;
  /** Recurrence interval like 1d, 7d, 2w, 1m, 1y (add, update). */
  recurrence?: string;
  /** list: include done items. */
  all?: boolean;
  /** list: only items past their due date. */
  overdue?: boolean;
  /** list: items due on/after this YYYY-MM-DD. */
  from?: string;
  /** list: items due on/before this YYYY-MM-DD. */
  to?: string;
  /** rm: skip interactive confirmation. */
  force?: boolean;
}

export function buildArgs(params: TodoParams): string[] {
  switch (params.action) {
    case "list": {
      const args = ["list"];
      if (params.all) args.push("--all");
      if (params.overdue) args.push("--overdue");
      if (params.category) args.push("--category", params.category);
      if (params.status) args.push("--status", params.status);
      if (params.from) args.push("--from", params.from);
      if (params.to) args.push("--to", params.to);
      return args;
    }
    case "add": {
      if (!params.name) throw new Error("name is required for add");
      const args = ["add", params.name];
      if (params.category) args.push("--category", params.category);
      if (params.due) args.push("--due", params.due);
      if (params.description) args.push("--desc", params.description);
      if (params.recurrence) args.push("--recurrence", params.recurrence);
      return args;
    }
    case "update": {
      if (!params.id) throw new Error("id is required for update");
      const args = ["update", params.id];
      if (params.name) args.push("--name", params.name);
      if (params.description) args.push("--desc", params.description);
      if (params.category) args.push("--category", params.category);
      if (params.status) args.push("--status", params.status);
      if (params.due) args.push("--due", params.due);
      if (params.recurrence) args.push("--recurrence", params.recurrence);
      return args;
    }
    case "done": {
      if (!params.id) throw new Error("id is required for done");
      return ["done", params.id];
    }
    case "rm": {
      if (!params.id) throw new Error("id is required for rm");
      const args = ["rm", params.id];
      if (params.force) args.push("--force");
      return args;
    }
    case "categories": {
      return ["categories"];
    }
  }
}