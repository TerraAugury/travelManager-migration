export function createRateLimitsDbMock() {
  const store = new Map();

  function exec(sql, params) {
    if (sql.includes("delete from rate_limits where key = ? and reset_at <= ?")) {
      const [key, now] = params;
      const row = store.get(key);
      if (row && row.reset_at <= now) store.delete(key);
      return { success: true };
    }
    if (sql.includes("insert into rate_limits")) {
      const [key, resetAt] = params;
      const row = store.get(key);
      if (!row) store.set(key, { count: 1, reset_at: resetAt });
      else store.set(key, { count: row.count + 1, reset_at: row.reset_at });
      return { success: true };
    }
    if (sql.includes("select count, reset_at from rate_limits where key = ?")) {
      const [key] = params;
      const row = store.get(key);
      return { results: row ? [{ count: row.count, reset_at: row.reset_at }] : [] };
    }
    if (sql.includes("delete from rate_limits where reset_at <= ?")) {
      const [now] = params;
      for (const [key, row] of store.entries()) {
        if (row.reset_at <= now) store.delete(key);
      }
      return { success: true };
    }
    throw new Error(`Unsupported SQL in test mock: ${sql}`);
  }

  function statement(sql, params = []) {
    return {
      _sql: sql,
      _params: params,
      bind(...boundParams) {
        return statement(sql, boundParams);
      },
      async run() {
        return exec(sql, params);
      }
    };
  }

  return {
    prepare(sql) {
      return statement(String(sql || "").trim().toLowerCase(), []);
    },
    async batch(statements) {
      return statements.map((stmt) => exec(stmt._sql, stmt._params));
    }
  };
}
