import { test } from "node:test";
import assert from "node:assert/strict";
import { buildArgs } from "./todo.ts";

test("list with no filters", () => {
  assert.deepEqual(buildArgs({ action: "list" }), ["list"]);
});

test("list with all filters", () => {
  assert.deepEqual(
    buildArgs({
      action: "list",
      all: true,
      overdue: true,
      category: "work",
      status: "todo",
      from: "2026-08-01",
      to: "2026-08-31",
    }),
    ["list", "--all", "--overdue", "--category", "work", "--status", "todo", "--from", "2026-08-01", "--to", "2026-08-31"],
  );
});

test("categories", () => {
  assert.deepEqual(buildArgs({ action: "categories" }), ["categories"]);
});

test("add requires name", () => {
  assert.throws(() => buildArgs({ action: "add" }), /name is required/);
});

test("add with all options", () => {
  assert.deepEqual(
    buildArgs({
      action: "add",
      name: "Foo the bar",
      category: "work",
      due: "2026-08-20",
      description: "longer text",
      recurrence: "1w",
    }),
    ["add", "Foo the bar", "--category", "work", "--due", "2026-08-20", "--desc", "longer text", "--recurrence", "1w"],
  );
});

test("update requires id", () => {
  assert.throws(() => buildArgs({ action: "update", name: "x" }), /id is required/);
});

test("update passes only specified flags", () => {
  assert.deepEqual(
    buildArgs({ action: "update", id: "01KJ5TSJGE44C958G5P268AF8E", status: "inprogress", due: "2026-09-01" }),
    ["update", "01KJ5TSJGE44C958G5P268AF8E", "--status", "inprogress", "--due", "2026-09-01"],
  );
});

test("done requires id", () => {
  assert.throws(() => buildArgs({ action: "done" }), /id is required/);
});

test("done with id", () => {
  assert.deepEqual(buildArgs({ action: "done", id: "01KJ5TSJGE44C958G5P268AF8E" }), [
    "done",
    "01KJ5TSJGE44C958G5P268AF8E",
  ]);
});

test("rm requires id", () => {
  assert.throws(() => buildArgs({ action: "rm", force: true }), /id is required/);
});

test("rm with force", () => {
  assert.deepEqual(buildArgs({ action: "rm", id: "01KJ5TSJGE44C958G5P268AF8E", force: true }), [
    "rm",
    "01KJ5TSJGE44C958G5P268AF8E",
    "--force",
  ]);
});

test("rm without force omits flag", () => {
  assert.deepEqual(buildArgs({ action: "rm", id: "01KJ5TSJGE44C958G5P268AF8E" }), [
    "rm",
    "01KJ5TSJGE44C958G5P268AF8E",
  ]);
});

test("list with all:false omits --all", () => {
  assert.deepEqual(buildArgs({ action: "list", all: false }), ["list"]);
});

test("list with overdue:false omits --overdue", () => {
  assert.deepEqual(buildArgs({ action: "list", overdue: false }), ["list"]);
});

test("rm with force:false omits --force", () => {
  assert.deepEqual(buildArgs({ action: "rm", id: "01KJ5TSJGE44C958G5P268AF8E", force: false }), [
    "rm",
    "01KJ5TSJGE44C958G5P268AF8E",
  ]);
});

test("add with only a name produces the minimal argv", () => {
  assert.deepEqual(buildArgs({ action: "add", name: "Solo" }), ["add", "Solo"]);
});

test("add with empty-string category omits the flag", () => {
  assert.deepEqual(buildArgs({ action: "add", name: "X", category: "" }), ["add", "X"]);
});

test("update with name includes --name", () => {
  assert.deepEqual(buildArgs({ action: "update", id: "01KJ5TSJGE44C958G5P268AF8E", name: "New" }), [
    "update",
    "01KJ5TSJGE44C958G5P268AF8E",
    "--name",
    "New",
  ]);
});

test("update with description includes --desc", () => {
  assert.deepEqual(buildArgs({ action: "update", id: "01KJ5TSJGE44C958G5P268AF8E", description: "d" }), [
    "update",
    "01KJ5TSJGE44C958G5P268AF8E",
    "--desc",
    "d",
  ]);
});

test("update with category includes --category", () => {
  assert.deepEqual(buildArgs({ action: "update", id: "01KJ5TSJGE44C958G5P268AF8E", category: "work" }), [
    "update",
    "01KJ5TSJGE44C958G5P268AF8E",
    "--category",
    "work",
  ]);
});

test("update with recurrence includes --recurrence", () => {
  assert.deepEqual(buildArgs({ action: "update", id: "01KJ5TSJGE44C958G5P268AF8E", recurrence: "1m" }), [
    "update",
    "01KJ5TSJGE44C958G5P268AF8E",
    "--recurrence",
    "1m",
  ]);
});
