import { hashAuthToken } from "../security/tokens.js";

const SESSION_DAYS = 30;

export function buildSessionsRepository({ pool }) {
  async function create({ userId, token, ttlDays = SESSION_DAYS }) {
    const tokenHash = hashAuthToken(token);
    const result = await pool.query(
      `INSERT INTO sessions (user_id, token_hash, expires_at)
       VALUES ($1, $2, NOW() + ($3 || ' days')::interval)
       RETURNING id, user_id, expires_at, created_at`,
      [userId, tokenHash, String(ttlDays)]
    );
    return result.rows[0];
  }

  async function findActiveByToken(token) {
    const tokenHash = hashAuthToken(token);
    const result = await pool.query(
      `SELECT id, user_id, expires_at, revoked_at, created_at
       FROM sessions
       WHERE token_hash = $1
         AND revoked_at IS NULL
         AND expires_at > NOW()`,
      [tokenHash]
    );
    return result.rows[0] || null;
  }

  async function revokeToken(token) {
    const tokenHash = hashAuthToken(token);
    const result = await pool.query(
      `UPDATE sessions
       SET revoked_at = NOW()
       WHERE token_hash = $1
         AND revoked_at IS NULL
       RETURNING id`,
      [tokenHash]
    );
    return result.rowCount > 0;
  }

  return {
    create,
    findActiveByToken,
    revokeToken
  };
}

