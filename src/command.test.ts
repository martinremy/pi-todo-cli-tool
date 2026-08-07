import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCommand, resolveDue, tokenize } from "./command.ts";

function today(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function offsetDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// --- tokenize ---

test("tokenize splits on whitespace", () => {
  assert.deepEqual(tokenize("a b  c"), ["a", "b", "c"]);
});

test("tokenize honours double quotes", () => {
  assert.deepEqual(tokenize('add "buy milk" due=tomorrow'), [
    "add",
    "buy milk",
    "due=tomorrow",
  ]);
});

test("tokenize honours single quotes", () => {
  assert.deepEqual(tokenize("add 'buy milk'"), ["add", "buy milk"]);
});

test("tokenize handles backslash escapes inside quotes", () => {
  assert.deepEqual(tokenize('desc="a \\"b\\" c"'), ['desc=a "b" c']);
});

// --- resolveDue ---

test("resolveDue passes YYYY-MM-DD through", () => {
  assert.equal(resolveDue("2026-12-01"), "2026-12-01");
});

test("resolveDue resolves today", () => {
  assert.equal(resolveDue("today"), today());
});

test("resolveDue resolves tomorrow", () => {
  assert.equal(resolveDue("tomorrow"), offsetDate(1));
});

test("resolveDue resolves relative days", () => {
  assert.equal(resolveDue("3d"), offsetDate(3));
});

test("resolveDue resolves relative weeks", () => {
  assert.equal(resolveDue("1w"), offsetDate(7));
});

test("resolveDue is case-insensitive", () => {
  assert.equal(resolveDue("TOMORROW"), offsetDate(1));
});

test("resolveDue returns unknown values unchanged", () => {
  assert.equal(resolveDue("next friday"), "next friday");
});

// --- parseCommand: list ---

test("empty input defaults to list", () => {
  assert.deepEqual(parseCommand(""), { action: "list" });
  assert.deepEqual(parseCommand("   "), { action: "list" });
});

test("list with no filters", () => {
  assert.deepEqual(parseCommand("list"), { action: "list" });
});

test("list with --all and --overdue", () => {
  assert.deepEqual(parseCommand("list --all --overdue"), {
    action: "list",
    all: true,
    overdue: true,
  });
});

test("list with bare all/overdue", () => {
  assert.deepEqual(parseCommand("list all overdue"), {
    action: "list",
    all: true,
    overdue: true,
  });
});

test("list with key=value filters and date resolution", () => {
  assert.deepEqual(parseCommand("list category=work status=todo from=today to=1w"), {
    action: "list",
    category: "work",
    status: "todo",
    from: today(),
    to: offsetDate(7),
  });
});

test("list rejects invalid status", () => {
  assert.throws(() => parseCommand("list status=bogus"), /invalid status "bogus"/);
});

// --- parseCommand: add ---

test("add collects leftover tokens as the name", () => {
  assert.deepEqual(parseCommand("add buy milk"), {
    action: "add",
    name: "buy milk",
  });
});

test("add with name flag", () => {
  assert.deepEqual(parseCommand('add name="buy milk"'), {
    action: "add",
    name: "buy milk",
  });
});

test("add with due/category/desc/recurrence", () => {
  assert.deepEqual(parseCommand('add buy milk due=tomorrow category=Home desc="weekly shop" recurrence=1w'), {
    action: "add",
    name: "buy milk",
    due: offsetDate(1),
    category: "Home",
    description: "weekly shop",
    recurrence: "1w",
  });
});

test("add treats unknown key=value tokens as part of the name", () => {
  // x=5 is not a known flag, so it stays in the name
  assert.deepEqual(parseCommand("add fix x=5 bug"), {
    action: "add",
    name: "fix x=5 bug",
  });
});

test("add with explicit YYYY-MM-DD due", () => {
  assert.deepEqual(parseCommand("add task due=2026-09-01"), {
    action: "add",
    name: "task",
    due: "2026-09-01",
  });
});

// --- parseCommand: update ---

test("update with positional id", () => {
  assert.deepEqual(parseCommand("update 01KJ5TSJGE44C958G5P268AF8E status=inprogress"), {
    action: "update",
    id: "01KJ5TSJGE44C958G5P268AF8E",
    status: "inprogress",
  });
});

test("update with positional id and positional name", () => {
  assert.deepEqual(parseCommand("update 01KJ5TSJGE44C958G5P268AF8E new name here"), {
    action: "update",
    id: "01KJ5TSJGE44C958G5P268AF8E",
    name: "new name here",
  });
});

test("update with id flag and positional name", () => {
  assert.deepEqual(parseCommand("update id=01KJ5TSJGE44C958G5P268AF8E renamed thing"), {
    action: "update",
    id: "01KJ5TSJGE44C958G5P268AF8E",
    name: "renamed thing",
  });
});

test("update with name flag", () => {
  assert.deepEqual(parseCommand("update 01KJ5TSJGE44C958G5P268AF8E name=New"), {
    action: "update",
    id: "01KJ5TSJGE44C958G5P268AF8E",
    name: "New",
  });
});

// --- parseCommand: done / rm / categories ---

test("done with positional id", () => {
  assert.deepEqual(parseCommand("done 01KJ5TSJGE44C958G5P268AF8E"), {
    action: "done",
    id: "01KJ5TSJGE44C958G5P268AF8E",
  });
});

test("done with id flag", () => {
  assert.deepEqual(parseCommand("done id=01KJ5TSJGE44C958G5P268AF8E"), {
    action: "done",
    id: "01KJ5TSJGE44C958G5P268AF8E",
  });
});

test("rm always applies force", () => {
  assert.deepEqual(parseCommand("rm 01KJ5TSJGE44C958G5P268AF8E"), {
    action: "rm",
    id: "01KJ5TSJGE44C958G5P268AF8E",
    force: true,
  });
});

test("categories", () => {
  assert.deepEqual(parseCommand("categories"), { action: "categories" });
});

// --- parseCommand: errors ---

test("unknown action throws", () => {
  assert.throws(() => parseCommand("frobnicate x"), /unknown action "frobnicate"/);
});
