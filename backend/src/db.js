export function buildDb(d1) {
  const pool = {
    async query(sql, params = []) {
      const d1sql = sql.replace(/\$\d+/g, "?");
      const stmt = d1.prepare(d1sql).bind(...params);
      const result = await stmt.all();
      const rowCount =
        result.results?.length > 0
          ? result.results.length
          : (result.meta?.changes ?? 0);
      return { rows: result.results ?? [], rowCount };
    }
  };

  async function check() {
    const row = await d1.prepare("SELECT 1 AS ok").first();
    return row?.ok === 1;
  }

  return { pool, check };
}

