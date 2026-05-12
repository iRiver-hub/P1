const Database = require("better-sqlite3");
const path = require("path");
const bcrypt = require("bcryptjs");

const dbPath = path.join(__dirname, "magnet.db");
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME
  )
`);

function createUser(username, email, password) {
  const hashedPassword = bcrypt.hashSync(password, 10);
  const stmt = db.prepare(
    "INSERT INTO users (username, email, password) VALUES (?, ?, ?)"
  );
  try {
    const result = stmt.run(username, email, hashedPassword);
    return { success: true, userId: result.lastInsertRowid };
  } catch (error) {
    if (error.message.includes("UNIQUE constraint failed")) {
      if (error.message.includes("username")) {
        return { success: false, error: "用户名已被注册" };
      }
      if (error.message.includes("email")) {
        return { success: false, error: "邮箱已被注册" };
      }
      return { success: false, error: "用户名或邮箱已被注册" };
    }
    return { success: false, error: "创建用户失败" };
  }
}

function findUserByUsername(username) {
  const stmt = db.prepare("SELECT * FROM users WHERE username = ?");
  return stmt.get(username);
}

function findUserByEmail(email) {
  const stmt = db.prepare("SELECT * FROM users WHERE email = ?");
  return stmt.get(email);
}

function findUserById(id) {
  const stmt = db.prepare("SELECT * FROM users WHERE id = ?");
  return stmt.get(id);
}

function verifyPassword(password, hashedPassword) {
  return bcrypt.compareSync(password, hashedPassword);
}

function updateLastLogin(id) {
  const stmt = db.prepare("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?");
  stmt.run(id);
}

module.exports = {
  db,
  createUser,
  findUserByUsername,
  findUserByEmail,
  findUserById,
  verifyPassword,
  updateLastLogin
};
