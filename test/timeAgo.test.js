import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { timeAgo } from "../bin/quickclaude.js";

describe("timeAgo", () => {
  it("returns 'just now' for current time", () => {
    assert.equal(timeAgo(Date.now()), "just now");
  });
});
