import crypto from "node:crypto";

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

  async function findAll({ role = null, active = null } = {}) {
    const result = await pool.query(
      `SELECT id, email, display_name, role, is_active, created_at
       FROM users
       WHERE ($1 IS NULL OR role = $1)
         AND ($2 IS NULL OR is_active = $2)
       ORDER BY created_at DESC, email`,
      [role, active]
    );
    return result.rows;
  }

  async function findById(userId) {
    const result = await pool.query(
      `SELECT id, email, display_name, role, is_active, created_at, updated_at
       FROM users
       WHERE id = $1`,
      [userId]
    );
    return result.rows[0] || null;
  }

  async function create({ email, displayName, passwordHash, role = "user" }) {
    const id = crypto.randomUUID();
    const result = await pool.query(
      `INSERT INTO users (id, email, display_name, password_hash, role, is_active)
       VALUES ($1, $2, $3, $4, $5, 1)
       RETURNING id, email, display_name, role, is_active, created_at, updated_at`,
      [id, email, displayName, passwordHash, role]
    );
    return result.rows[0] || null;
  }

  async function update(userId, patch) {
    const result = await pool.query(
      `UPDATE users
       SET
         display_name = COALESCE($2, display_name),
         role = COALESCE($3, role),
         is_active = COALESCE($4, is_active),
         password_hash = COALESCE($5, password_hash),
         updated_at = datetime('now')
       WHERE id = $1
       RETURNING id, email, display_name, role, is_active, created_at, updated_at`,
      [
        userId,
        patch.displayName ?? null,
        patch.role ?? null,
        patch.isActive ?? null,
        patch.passwordHash ?? null
      ]
    );
    return result.rows[0] || null;
  }

  return {
    findActiveById,
    findAuthByEmail,
    findAll,
    findById,
    create,
    update
  };
}
