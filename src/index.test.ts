import { test } from "node:test";
import assert from "node:assert/strict";
import factory from "./index.ts";

interface ExecResult {
  stdout: string;
  stderr: string;
  code: number;
  killed: boolean;
}

type ExecImpl = (
  cmd: string,
  args: string[],
  opts?: { signal?: AbortSignal },
) => Promise<ExecResult>;

interface StubCtx {
  ui: { notify: (msg: string, level?: "info" | "warning" | "error") => void };
  signal?: AbortSignal;
}

interface CapturedCommand {
  description?: string;
  getArgumentCompletions?: (prefix: string) => unknown;
  handler: (args: string, ctx: StubCtx) => Promise<void>;
}

interface Harness {
  command: CapturedCommand;
  execCalls: { cmd: string; args: string[]; signal?: AbortSignal }[];
}

/**
 * Load the extension against a stub `pi` that captures the registered command
 * and records every `pi.exec` call. The real `todo` binary is never invoked —
 * these tests cover the extension's glue, not the CLI.
 */
function setup(execImpl: ExecImpl): Harness {
  const execCalls: { cmd: string; args: string[]; signal?: AbortSignal }[] = [];
  let command: CapturedCommand | undefined;
  const pi = {
    registerCommand(_name: string, options: CapturedCommand) {
      command = options;
    },
    exec: async (cmd: string, args: string[], opts?: { signal?: AbortSignal }) => {
      execCalls.push({ cmd, args, signal: opts?.signal });
      return execImpl(cmd, args, opts);
    },
  } as unknown as Parameters<typeof factory>[0];
  factory(pi);
  if (!command) throw new Error("extension did not register a command");
  return { command, execCalls };
}

/** Run the handler, capturing every notify() call. */
async function run(
  command: CapturedCommand,
  args: string,
  signal?: AbortSignal,
): Promise<{ messages: { msg: string; level: string }[] }> {
  const messages: { msg: string; level: string }[] = [];
  const ctx: StubCtx = {
    ui: {
      notify: (msg, level = "info") => messages.push({ msg, level }),
    },
    signal,
  };
  await command.handler(args, ctx);
  return { messages };
}

const ok = async (): Promise<ExecResult> => ({ stdout: "", stderr: "", code: 0, killed: false });

test("registers a command named todo with a description and completions", () => {
  const { command } = setup(ok);
  assert.ok(command.description && command.description.length > 0);
  assert.equal(typeof command.handler, "function");
  assert.equal(typeof command.getArgumentCompletions, "function");
});

test("getArgumentCompletions returns matching actions", () => {
  const { command } = setup(ok);
  const completions = command.getArgumentCompletions!("l") as { value: string; label: string }[];
  assert.deepEqual(completions, [{ value: "list", label: "list" }]);
});

test("getArgumentCompletions returns null when nothing matches", () => {
  const { command } = setup(ok);
  assert.equal(command.getArgumentCompletions!("zzz"), null);
});

test("handler parses list and notifies with trimmed stdout", async () => {
  const { command, execCalls } = setup(async () => ({ stdout: '  {"id":"x"}\n  ', stderr: "", code: 0, killed: false }));
  const { messages } = await run(command, "list");
  assert.deepEqual(execCalls, [{ cmd: "todo", args: ["list"], signal: undefined }]);
  assert.deepEqual(messages, [{ msg: '{"id":"x"}', level: "info" }]);
});

test("handler parses add with natural-language name and resolves relative dates", async () => {
  const { command, execCalls } = setup(async () => ({ stdout: "", stderr: "", code: 0, killed: false }));
  await run(command, "add buy milk due=tomorrow category=Home");
  const args = execCalls[0].args;
  assert.equal(args[0], "add");
  assert.equal(args[1], "buy milk");
  assert.equal(args[args.indexOf("--category") + 1], "Home");
  assert.match(args[args.indexOf("--due") + 1], /^\d{4}-\d{2}-\d{2}$/);
});

test("handler notifies error on non-zero exit using stderr", async () => {
  const { command } = setup(async () => ({ stdout: "", stderr: "no such todo", code: 1, killed: false }));
  const { messages } = await run(command, "done 01KJ5TSJGE44C958G5P268AF8E");
  assert.equal(messages.length, 1);
  assert.equal(messages[0].level, "error");
  assert.match(messages[0].msg, /todo done failed \(exit 1\): no such todo/);
});

test("handler notifies error on non-zero exit falling back to stdout when stderr empty", async () => {
  const { command } = setup(async () => ({ stdout: "boom", stderr: "", code: 2, killed: false }));
  const { messages } = await run(command, "rm 01KJ5TSJGE44C958G5P268AF8E");
  assert.match(messages[0].msg, /todo rm failed \(exit 2\): boom/);
});

test("handler notifies warning when killed", async () => {
  const { command } = setup(async () => ({ stdout: "", stderr: "", code: 1, killed: true }));
  const { messages } = await run(command, "list");
  assert.equal(messages[0].level, "warning");
  assert.match(messages[0].msg, /todo list was cancelled/);
});

test("handler notifies fallback message when stdout is blank", async () => {
  const { command } = setup(async () => ({ stdout: "   ", stderr: "", code: 0, killed: false }));
  const { messages } = await run(command, "add X");
  assert.equal(messages[0].msg, "todo add completed.");
});

test("handler notifies parse error on unknown action and does not exec", async () => {
  const { command, execCalls } = setup(ok);
  const { messages } = await run(command, "frobnicate");
  assert.equal(execCalls.length, 0);
  assert.equal(messages[0].level, "error");
  assert.match(messages[0].msg, /unknown action "frobnicate"/);
});

test("handler notifies buildArgs error when add has no name and does not exec", async () => {
  const { command, execCalls } = setup(ok);
  const { messages } = await run(command, "add");
  assert.equal(execCalls.length, 0);
  assert.equal(messages[0].level, "error");
  assert.match(messages[0].msg, /name is required/);
});

test("handler forwards the abort signal to pi.exec", async () => {
  const { command, execCalls } = setup(ok);
  const ac = new AbortController();
  await run(command, "list", ac.signal);
  assert.equal(execCalls[0].signal, ac.signal);
});
