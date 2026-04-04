import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { resolvePath } from "../bin/quickclaude.js";

describe("resolvePath", () => {
  let root;

  before(() => {
    root = mkdtempSync(join(tmpdir(), "qc-test-"));
    // Create directory structure:
    // root/Users/test/projects/my-app/
    // root/Users/test/projects/mcp-overwatch/
    // root/Users/test/My Documents/
    mkdirSync(join(root, "Users", "test", "projects", "my-app"), { recursive: true });
    mkdirSync(join(root, "Users", "test", "projects", "mcp-overwatch"), { recursive: true });
    mkdirSync(join(root, "Users", "test", "My Documents"), { recursive: true });
  });

  after(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("resolves a simple path", () => {
    const encoded = "-Users-test-projects-my-app";
    assert.equal(resolvePath(encoded, root), join(root, "Users", "test", "projects", "my-app"));
  });

  it("resolves hyphenated directory names", () => {
    const encoded = "-Users-test-projects-mcp-overwatch";
    assert.equal(resolvePath(encoded, root), join(root, "Users", "test", "projects", "mcp-overwatch"));
  });

  it("resolves space-separated directory names", () => {
    const encoded = "-Users-test-My-Documents";
    assert.equal(resolvePath(encoded, root), join(root, "Users", "test", "My Documents"));
  });

  it("returns null for non-existent paths", () => {
    const encoded = "-Users-test-nonexistent";
    assert.equal(resolvePath(encoded, root), null);
  });

  it("returns null for empty input", () => {
    assert.equal(resolvePath("", root), null);
  });
});
