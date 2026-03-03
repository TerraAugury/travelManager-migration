import test from "node:test";
import assert from "node:assert/strict";
import { buildDb } from "../src/db.js";

function createD1Mock() {
  const state = { sql: null, params: null };
  return {
    state,
    d1: {
      prepare(sql) {
        state.sql = sql;
        return {
          bind(...params) {
            state.params = params;
            return {
              async all() {
                return { results: [{ id: "row-1" }], meta: { changes: 0 } };
              }
            };
          }
        };
      }
    }
  };
}

test("buildDb.query duplicates parameters when placeholder index repeats", async () => {
  const { d1, state } = createD1Mock();
  const { pool } = buildDb(d1);

  const rows = await pool.query(
    `SELECT id FROM users
     WHERE ($1 IS NULL OR role = $1)
       AND ($2 IS NULL OR is_active = $2)`,
    ["user", 1]
  );

  assert.equal(rows.rowCount, 1);
  assert.match(state.sql, /\(\? IS NULL OR role = \?\)/);
  assert.match(state.sql, /\(\? IS NULL OR is_active = \?\)/);
  assert.deepEqual(state.params, ["user", "user", 1, 1]);
});

test("buildDb.query keeps parameter order for unique placeholders", async () => {
  const { d1, state } = createD1Mock();
  const { pool } = buildDb(d1);

  await pool.query("SELECT id FROM users WHERE id = $1 AND email = $2", ["u1", "a@b.com"]);

  assert.equal(state.sql, "SELECT id FROM users WHERE id = ? AND email = ?");
  assert.deepEqual(state.params, ["u1", "a@b.com"]);
});
