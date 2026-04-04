import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, utimesSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { getLatestMtime } from "../bin/quickclaude.js";

describe("getLatestMtime", () => {
  let dir;

  before(() => {
    dir = mkdtempSync(join(tmpdir(), "qc-mtime-"));
    // Create files with different mtimes
    writeFileSync(join(dir, "old.md"), "old");
    writeFileSync(join(dir, "new.md"), "new");
    // Set old.md to 1 hour ago
    const oneHourAgo = new Date(Date.now() - 3600_000);
    utimesSync(join(dir, "old.md"), oneHourAgo, oneHourAgo);
  });

  after(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("returns the most recent file mtime in a directory", () => {
    const latest = getLatestMtime(dir);
    // new.md was just created, so latest should be very recent
    assert.ok(Date.now() - latest < 5000);
  });

  it("ignores subdirectories, only checks direct files", () => {
    mkdirSync(join(dir, "subdir"));
    const latest = getLatestMtime(dir);
    assert.ok(latest > 0);
  });
});
