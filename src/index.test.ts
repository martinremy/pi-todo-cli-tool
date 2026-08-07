import { test } from "node:test";
import assert from "node:assert/strict";
import factory from "./index.ts";

interface CapturedCommand {
  description?: string;
  getArgumentCompletions?: (prefix: string) => unknown;
  handler: (args: string, ctx: unknown) => Promise<void>;
}

interface Harness {
  command: CapturedCommand;
  sentMessages: string[];
}

/**
 * Load the extension against a stub `pi` that captures the registered command
 * and records every `pi.sendUserMessage` call. No real agent turn is triggered.
 */
function setup(): Harness {
  const sentMessages: string[] = [];
  let command: CapturedCommand | undefined;
  const pi = {
    registerCommand(_name: string, options: CapturedCommand) {
      command = options;
    },
    sendUserMessage(content: string) {
      sentMessages.push(content);
    },
  } as unknown as Parameters<typeof factory>[0];
  factory(pi);
  if (!command) throw new Error("extension did not register a command");
  return { command, sentMessages };
}

/** Run the handler with a stub ctx. */
async function run(command: CapturedCommand, args: string): Promise<void> {
  await command.handler(args, {});
}

// --- registration ---

test("registers a command named todo with a description and completions", () => {
  const { command } = setup();
  assert.ok(command.description && command.description.length > 0);
  assert.equal(typeof command.handler, "function");
  assert.equal(typeof command.getArgumentCompletions, "function");
});

test("getArgumentCompletions returns matching hints", () => {
  const { command } = setup();
  const completions = command.getArgumentCompletions!("l") as {
    value: string;
    label: string;
  }[];
  assert.ok(completions.some((c) => c.value === "list"));
});

test("getArgumentCompletions returns null when nothing matches", () => {
  const { command } = setup();
  assert.equal(command.getArgumentCompletions!("zzz"), null);
});

// --- forwarding ---

test("forwards natural language to the agent via sendUserMessage", async () => {
  const { command, sentMessages } = setup();
  await run(command, "what's on my list?");
  assert.equal(sentMessages.length, 1);
  assert.match(sentMessages[0], /todo-cli skill/);
  assert.match(sentMessages[0], /what's on my list\?/);
});

test("forwards 'mark brushing teeth as complete'", async () => {
  const { command, sentMessages } = setup();
  await run(command, "mark brushing teeth as complete");
  assert.equal(sentMessages.length, 1);
  assert.match(sentMessages[0], /mark brushing teeth as complete/);
});

test("forwards 'add water the garden due in 3 days'", async () => {
  const { command, sentMessages } = setup();
  await run(command, "add water the garden due in 3 days");
  assert.equal(sentMessages.length, 1);
  assert.match(sentMessages[0], /add water the garden due in 3 days/);
});

test("forwards recurring todo request verbatim", async () => {
  const { command, sentMessages } = setup();
  const nl =
    "add a recurring todo for watering the garden every 7 days, first due date tomorrow";
  await run(command, nl);
  assert.equal(sentMessages.length, 1);
  assert.match(sentMessages[0], /todo-cli skill/);
  assert.match(sentMessages[0], /watering the garden every 7 days/);
});

test("defaults to 'list my todos' when input is empty", async () => {
  const { command, sentMessages } = setup();
  await run(command, "");
  assert.equal(sentMessages.length, 1);
  assert.match(sentMessages[0], /list my todos/);
});

test("defaults to 'list my todos' when input is whitespace", async () => {
  const { command, sentMessages } = setup();
  await run(command, "   ");
  assert.equal(sentMessages.length, 1);
  assert.match(sentMessages[0], /list my todos/);
});

test("every forwarded message explicitly requests the todo-cli skill", async () => {
  const { command, sentMessages } = setup();
  await run(command, "what's overdue?");
  assert.match(sentMessages[0], /Invoke the todo-cli skill/);
});

test("forwards 'what are my overdue work items?'", async () => {
  const { command, sentMessages } = setup();
  await run(command, "what are my overdue work items?");
  assert.match(sentMessages[0], /overdue work items/);
});
