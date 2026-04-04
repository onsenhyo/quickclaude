import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { timeAgo } from "../bin/quickclaude.js";

describe("timeAgo", () => {
  function msAgo(ms) {
    return Date.now() - ms;
  }

  it("returns 'just now' for <60 seconds ago", () => {
    assert.equal(timeAgo(msAgo(0)), "just now");
    assert.equal(timeAgo(msAgo(30_000)), "just now");
    assert.equal(timeAgo(msAgo(59_000)), "just now");
  });

  it("returns minutes for 1-59 minutes ago", () => {
    assert.equal(timeAgo(msAgo(60_000)), "1m ago");
    assert.equal(timeAgo(msAgo(30 * 60_000)), "30m ago");
    assert.equal(timeAgo(msAgo(59 * 60_000)), "59m ago");
  });

  it("returns hours for 1-23 hours ago", () => {
    assert.equal(timeAgo(msAgo(60 * 60_000)), "1h ago");
    assert.equal(timeAgo(msAgo(12 * 60 * 60_000)), "12h ago");
    assert.equal(timeAgo(msAgo(23 * 60 * 60_000)), "23h ago");
  });

  it("returns days for 1-6 days ago", () => {
    assert.equal(timeAgo(msAgo(24 * 60 * 60_000)), "1d ago");
    assert.equal(timeAgo(msAgo(6 * 24 * 60 * 60_000)), "6d ago");
  });

  it("returns weeks for 7-27 days ago", () => {
    assert.equal(timeAgo(msAgo(7 * 24 * 60 * 60_000)), "1w ago");
    assert.equal(timeAgo(msAgo(21 * 24 * 60 * 60_000)), "3w ago");
  });

  it("returns months for 28+ days ago", () => {
    assert.equal(timeAgo(msAgo(30 * 24 * 60 * 60_000)), "1mo ago");
    assert.equal(timeAgo(msAgo(90 * 24 * 60 * 60_000)), "3mo ago");
  });
});
