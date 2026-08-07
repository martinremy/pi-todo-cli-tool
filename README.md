# pi-todo-cli-command

A [Pi](https://pi.dev) extension that exposes the [`todo` CLI](https://github.com/martinremy/todo-cli) as a user-invoked `/todo` slash command with **natural language** input.

Type `/todo` followed by anything you'd say to a human assistant, and the request is forwarded to the agent, which uses the `todo-cli` skill to translate your words into the right CLI commands.

This is a **command, not a tool**: the agent cannot call it autonomously, so it never bleeds into skill checklists or task-tracking workflows. You invoke it explicitly with `/todo`.

## Requirements

- [Pi](https://pi.dev) (`@earendil-works/pi-coding-agent`)
- The `todo` binary installed and in `PATH` (see [todo-cli](https://github.com/martinremy/todo-cli))
- The `todo-cli` skill loaded in your Pi session (provides the CLI reference the agent needs to translate natural language into `todo` commands)

## Install

```bash
pi install git:github.com/martinremy/pi-todo-cli-command
```

Or load it directly from a local clone:

```bash
pi -e /path/to/pi-todo-cli-command/src/index.ts
```

## Usage

Type `/todo` followed by natural language:

```
/todo what's on my list?
/todo what's overdue?
/todo what are my overdue work items?
/todo mark brushing teeth as complete
/todo add an item water the garden due in 3 days
/todo add a recurring todo for watering the garden every 7 days, first due date tomorrow
```

`/todo` with nothing after it defaults to listing your todos.

## How it works

1. You type `/todo <natural language>`.
2. The command handler forwards your text to the agent as a user message via `pi.sendUserMessage`, explicitly requesting the `todo-cli` skill.
3. The `using-superpowers` bootstrap loads the skill, which documents the `todo` CLI (commands, ULID lookup, date formats, recurrence, JSONL output).
4. The agent uses the CLI through bash to fulfil your request — listing, matching by name, resolving dates, and invoking the right commands.

The extension itself does no parsing or CLI execution — it's a thin forwarder. All the natural-language understanding happens in the agent, guided by the skill.

## Development

```bash
npm install          # dev dependencies (typescript, pi packages for types)
npm test             # unit tests for the command handler (node:test)
npm run typecheck    # tsc --noEmit
```

No build step — Pi loads TypeScript extensions directly via jiti.

## License

MIT
