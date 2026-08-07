# pi-todo-cli-command

A [Pi](https://pi.dev) extension that exposes the [`todo` CLI](https://github.com/martinremy/todo-cli) as a user-invoked `/todo` slash command, so you can manage your personal todo list (list, add, update, done, rm, categories) directly from the Pi prompt.

This is a **command**, not a tool: the agent cannot call it autonomously, so it never bleeds into skill checklists or task-tracking workflows. You invoke it explicitly with `/todo`.

## Requirements

- [Pi](https://pi.dev) (`@earendil-works/pi-coding-agent`)
- The `todo` binary installed and in `PATH` (see [todo-cli](https://github.com/martinremy/todo-cli))

## Install

```bash
pi install git:github.com/martinremy/pi-todo-cli-command
```

Or load it directly from a local clone:

```bash
pi -e /path/to/pi-todo-cli-command/src/index.ts
```

## Usage

Type `/todo` followed by an action and natural-language arguments:

```
/todo list
/todo list --overdue
/todo add renew my passport due=2026-09-01 category=life
/todo add buy milk due=tomorrow category=home desc="weekly shop"
/todo update 01KJ5TSJGE44C958G5P268AF8E status=inprogress
/todo done 01KJ5TSJGE44C958G5P268AF8E
/todo rm 01KJ5TSJGE44C958G5P268AF8E
/todo categories
```

The first token is the action (`list`, `add`, `update`, `done`, `rm`, `categories`); everything after it is parsed into flags and a free-text name. `/todo` with nothing after it defaults to `list`.

Dates accept `YYYY-MM-DD`, `today`, `tomorrow`, or relative offsets like `3d`, `1w`, `2m`, `1y` (from today). Multi-word values can be quoted: `desc="a longer note"`.

`list` returns the CLI's JSONL output verbatim. `rm` always runs with `--force` since the CLI is invoked non-interactively.

## Development

```bash
npm install          # dev dependencies (typescript, pi packages for types)
npm test             # unit tests for the argument builder, command parser, and command handler (node:test)
npm run typecheck    # tsc --noEmit
```

No build step — Pi loads TypeScript extensions directly via jiti.

## License

MIT