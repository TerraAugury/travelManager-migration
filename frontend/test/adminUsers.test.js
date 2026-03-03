import test from "node:test";
import assert from "node:assert/strict";
import { buildUpdateUserBody, buildUsersQuery } from "../src/adminUsers.js";

test("buildUsersQuery includes only allowed filters", () => {
  assert.equal(buildUsersQuery({}), "");
  assert.equal(buildUsersQuery({ role: "admin" }), "?role=admin");
  assert.equal(
    buildUsersQuery({ role: "user", active: "false" }),
    "?role=user&active=false"
  );
  assert.equal(buildUsersQuery({ active: "all" }), "");
});

test("buildUpdateUserBody omits blank password", () => {
  const body = buildUpdateUserBody({
    display_name: "  Alice  ",
    role: "admin",
    is_active: "false",
    password: "   "
  });
  assert.deepEqual(body, {
    display_name: "Alice",
    role: "admin",
    is_active: false
  });
});

test("buildUpdateUserBody includes non-empty password", () => {
  const body = buildUpdateUserBody({
    display_name: "Bob",
    role: "user",
    is_active: "true",
    password: "new-password"
  });
  assert.equal(body.password, "new-password");
  assert.equal(body.is_active, true);
  assert.equal(body.role, "user");
});
