# pi-todo-cli-tool

A [Pi](https://pi.dev) extension that registers the [`todo` CLI](https://github.com/martinremy/todo-cli) as an LLM tool, so the agent can manage your personal todo list (list, add, update, done, rm, categories).

## Requirements

- [Pi](https://pi.dev) (`@earendil-works/pi-coding-agent`)
- The `todo` binary installed and in `PATH` (see [todo-cli](https://github.com/martinremy/todo-cli))

## Install

```bash
pi install git:github.com/martinremy/pi-todo-cli-tool
```

Or load it directly from a local clone:

```bash
pi -e /path/to/pi-todo-cli-tool/src/index.ts
```

## Usage

Once installed, ask Pi things like:

- "Add a todo to renew my passport, due 2026-09-01, category life"
- "What's on my todo list this week?"
- "Mark the passport todo as done"

The extension registers a single tool named `todo` whose `action` parameter mirrors the CLI subcommands. `list` returns the CLI's JSONL output verbatim.

## Development

```bash
npm install          # dev dependencies (typescript, pi packages for types)
npm test             # unit tests for the argument builder and tool execute glue (node:test)
npm run typecheck    # tsc --noEmit
```

No build step — Pi loads TypeScript extensions directly via jiti.

## License

MIT