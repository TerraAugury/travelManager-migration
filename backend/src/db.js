import pg from "pg";

const { Pool } = pg;

export function buildDb({ databaseUrl }) {
  const pool = new Pool({
    connectionString: databaseUrl,
    max: 10
  });

  async function check() {
    const result = await pool.query("SELECT 1 AS ok");
    return result.rows?.[0]?.ok === 1;
  }

  async function close() {
    await pool.end();
  }

  return {
    pool,
    check,
    close
  };
}

