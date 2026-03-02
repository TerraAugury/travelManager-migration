export function buildUsersRepository({ pool }) {
  async function findActiveById(userId) {
    const result = await pool.query(
      `SELECT id, email, display_name, role, is_active, created_at, updated_at
       FROM users
       WHERE id = $1 AND is_active = TRUE`,
      [userId]
    );
    return result.rows[0] || null;
  }

  async function findAuthByEmail(email) {
    const result = await pool.query(
      `SELECT id, email, display_name, role, is_active, password_hash, created_at, updated_at
       FROM users
       WHERE LOWER(email) = LOWER($1)`,
      [email]
    );
    return result.rows[0] || null;
  }

  return {
    findActiveById,
    findAuthByEmail
  };
}
