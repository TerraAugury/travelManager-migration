export function buildDb(d1) {
  function toD1Query(sql, params = []) {
    const orderedParams = [];
    const d1sql = sql.replace(/\$(\d+)/g, (_, indexText) => {
      const index = Number.parseInt(indexText, 10) - 1;
      orderedParams.push(params[index]);
      return "?";
    });
    return { d1sql, orderedParams: orderedParams.length > 0 ? orderedParams : params };
  }

  const pool = {
    async query(sql, params = []) {
      const { d1sql, orderedParams } = toD1Query(sql, params);
      const stmt = d1.prepare(d1sql).bind(...orderedParams);
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
