import test from "node:test";
import assert from "node:assert/strict";
import { generateAuthToken, hashAuthToken } from "../src/security/tokens.js";

test("generateAuthToken returns prefixed random token", () => {
  const token = generateAuthToken();
  assert.match(token, /^tm_[A-Za-z0-9_-]+$/);
});

test("hashAuthToken is deterministic and non-empty", () => {
  const a = hashAuthToken("abc");
  const b = hashAuthToken("abc");
  const c = hashAuthToken("def");
  assert.equal(a, b);
  assert.notEqual(a, c);
  assert.equal(a.length, 64);
});

