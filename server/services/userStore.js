const bcrypt = require("bcryptjs");
const { run, get, all, runReturning } = require("../db/database");

function nextUserId() {
  const meta = get("SELECT value FROM meta WHERE key = 'users_next_id'");
  if (meta) return parseInt(meta.value, 10);
  const max = get("SELECT MAX(id) AS m FROM users");
  return (max?.m || 0) + 1;
}

function createUser(username, email, password) {
  const existing = get("SELECT id, username, email FROM users WHERE username = ? OR email = ?", [username, email]);
  if (existing) {
    if (existing.username === username) return { success: false, error: "???????" };
    if (existing.email === email) return { success: false, error: "??????" };
    return { success: false, error: "??????????" };
  }

  const id = nextUserId();
  const hashed = bcrypt.hashSync(password, 10);
  const now = new Date().toISOString();

  run(
    "INSERT INTO users (id, username, email, password, role, created_at) VALUES (?, ?, ?, ?, 'user', ?)",
    [id, username, email, hashed, now]
  );
  run("INSERT OR REPLACE INTO meta (key, value) VALUES ('users_next_id', ?)", [String(id + 1)]);

  return { success: true, userId: id };
}

function findUserByUsername(username) {
  return get("SELECT * FROM users WHERE username = ?", [username]) || null;
}

function findUserByEmail(email) {
  return get("SELECT * FROM users WHERE email = ?", [email]) || null;
}

function findUserById(id) {
  return get("SELECT * FROM users WHERE id = ?", [id]) || null;
}

function verifyPassword(password, hashedPassword) {
  return bcrypt.compareSync(password, hashedPassword);
}

function updateLastLogin(id) {
  run("UPDATE users SET last_login = ? WHERE id = ?", [new Date().toISOString(), id]);
}

function listUsers(limit = 100, offset = 0) {
  return all("SELECT id, username, email, role, created_at, last_login FROM users ORDER BY id DESC LIMIT ? OFFSET ?", [limit, offset]);
}

function countUsers() {
  return get("SELECT COUNT(*) AS c FROM users").c;
}

function toPublicUser(row) {
  if (!row) return null;
  return { id: row.id, username: row.username, email: row.email, role: row.role || "user" };
}

module.exports = {
  createUser,
  findUserByUsername,
  findUserByEmail,
  findUserById,
  verifyPassword,
  updateLastLogin,
  listUsers,
  countUsers,
  toPublicUser
};
