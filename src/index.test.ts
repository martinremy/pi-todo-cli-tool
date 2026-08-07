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

// Load the extension against a stub `pi` that captures the registered tool and
// routes `exec` to the provided implementation. The real `todo` binary is never
// invoked — these tests cover the extension's glue, not the CLI.
function loadTool(execImpl: ExecImpl): Record<string, unknown> {
  let tool: Record<string, unknown> | undefined;
  const pi = {
    registerTool(def: Record<string, unknown>) {
      tool = def;
    },
    exec: execImpl,
  } as unknown as Parameters<typeof factory>[0];
  factory(pi);
  if (!tool) throw new Error("extension did not register a tool");
  return tool;
}

async function callExecute(
  tool: Record<string, unknown>,
  params: Record<string, unknown>,
  signal?: AbortSignal,
) {
  const execute = tool.execute as (
    id: string,
    params: Record<string, unknown>,
    signal?: AbortSignal,
    onUpdate?: unknown,
    ctx?: unknown,
  ) => Promise<Record<string, unknown>>;
  return execute("call-1", params, signal, undefined, undefined);
}

test("execute returns trimmed stdout as text and records action/args in details", async () => {
  let received: { cmd: string; args: string[] } | null = null;
  const tool = loadTool(async (cmd, args) => {
    received = { cmd, args };
    return { stdout: '  {"id":"x"}\n  ', stderr: "", code: 0, killed: false };
  });
  const result = await callExecute(tool, { action: "list" });
  assert.equal(received!.cmd, "todo");
  assert.deepEqual(received!.args, ["list"]);
  assert.deepEqual(result.content, [{ type: "text", text: '{"id":"x"}' }]);
  assert.deepEqual(result.details, { action: "list", args: ["list"] });
});

test("execute throws on non-zero exit using stderr", async () => {
  const tool = loadTool(async () => ({ stdout: "", stderr: "no such todo", code: 1, killed: false }));
  await assert.rejects(
    () => callExecute(tool, { action: "done", id: "01KJ5TSJGE44C958G5P268AF8E" }),
    /todo done failed \(exit 1\): no such todo/,
  );
});

test("execute throws on non-zero exit falling back to stdout when stderr is empty", async () => {
  const tool = loadTool(async () => ({ stdout: "boom", stderr: "", code: 2, killed: false }));
  await assert.rejects(
    () => callExecute(tool, { action: "rm", id: "01KJ5TSJGE44C958G5P268AF8E", force: true }),
    /todo rm failed \(exit 2\): boom/,
  );
});

test("execute throws cancelled when killed (takes precedence over exit code)", async () => {
  const tool = loadTool(async () => ({ stdout: "", stderr: "", code: 1, killed: true }));
  await assert.rejects(
    () => callExecute(tool, { action: "list" }),
    /todo list was cancelled/,
  );
});

test("execute returns fallback message when stdout is blank", async () => {
  const tool = loadTool(async () => ({ stdout: "   ", stderr: "", code: 0, killed: false }));
  const result = await callExecute(tool, { action: "add", name: "X" });
  assert.equal(
    (result.content as Array<{ text: string }>)[0].text,
    "todo add completed successfully (no output).",
  );
});

test("execute forwards the abort signal to pi.exec", async () => {
  let receivedSignal: AbortSignal | undefined;
  const tool = loadTool(async (_cmd, _args, opts) => {
    receivedSignal = opts?.signal;
    return { stdout: "", stderr: "", code: 0, killed: false };
  });
  const ac = new AbortController();
  await callExecute(tool, { action: "list" }, ac.signal);
  assert.equal(receivedSignal, ac.signal);
});

test("execute builds args from params before calling exec", async () => {
  let receivedArgs: string[] | null = null;
  const tool = loadTool(async (_cmd, args) => {
    receivedArgs = args;
    return { stdout: "", stderr: "", code: 0, killed: false };
  });
  await callExecute(tool, { action: "add", name: "Foo", due: "2026-08-20", category: "work" });
  assert.deepEqual(receivedArgs, ["add", "Foo", "--category", "work", "--due", "2026-08-20"]);
});
