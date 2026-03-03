import test from "node:test";
import assert from "node:assert/strict";
import { createUser, deleteUser, listUsers, updateUser } from "../src/api.js";

function mockFetch({ ok = true, body = {} } = {}) {
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    return {
      ok,
      status: ok ? 200 : 400,
      async text() {
        return JSON.stringify(body);
      }
    };
  };
  return calls;
}

test("listUsers sends filters in query string", async () => {
  const calls = mockFetch({ body: { items: [] } });
  await listUsers("token-1", { role: "admin", active: "true" });
  assert.equal(calls[0].url, "/api/admin/users?role=admin&active=true");
  assert.equal(calls[0].options.headers.Authorization, "Bearer token-1");
});

test("createUser uses POST with JSON body", async () => {
  const calls = mockFetch({ body: { id: "u1" } });
  await createUser("token-2", { email: "a@b.com", password: "password123", display_name: "A", role: "user" });
  assert.equal(calls[0].url, "/api/admin/users");
  assert.equal(calls[0].options.method, "POST");
  assert.match(String(calls[0].options.body), /"email":"a@b.com"/);
});

test("updateUser encodes id and uses PATCH", async () => {
  const calls = mockFetch({ body: { id: "u2" } });
  await updateUser("token-3", "user/id", { role: "admin" });
  assert.equal(calls[0].url, "/api/admin/users/user%2Fid");
  assert.equal(calls[0].options.method, "PATCH");
});

test("deleteUser uses DELETE", async () => {
  const calls = mockFetch({ body: null });
  await deleteUser("token-4", "u4");
  assert.equal(calls[0].url, "/api/admin/users/u4");
  assert.equal(calls[0].options.method, "DELETE");
});
