const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");

const dbPath = path.join(__dirname, "users.json");

function loadDB() {
  try {
    if (fs.existsSync(dbPath)) {
      const data = fs.readFileSync(dbPath, "utf8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Error loading database:", error);
  }
  return { users: [], nextId: 1 };
}

function saveDB(data) {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), "utf8");
  } catch (error) {
    console.error("Error saving database:", error);
  }
}

let db = loadDB();

function createUser(username, email, password) {
  const hashedPassword = bcrypt.hashSync(password, 10);

  const existingUser = db.users.find(
    (u) => u.username === username || u.email === email
  );

  if (existingUser) {
    if (existingUser.username === username) {
      return { success: false, error: "用户名已被注册" };
    }
    if (existingUser.email === email) {
      return { success: false, error: "邮箱已被注册" };
    }
    return { success: false, error: "用户名或邮箱已被注册" };
  }

  const newUser = {
    id: db.nextId,
    username: username,
    email: email,
    password: hashedPassword,
    created_at: new Date().toISOString(),
    last_login: null
  };

  db.users.push(newUser);
  db.nextId++;
  saveDB(db);

  return { success: true, userId: newUser.id };
}

function findUserByUsername(username) {
  return db.users.find((u) => u.username === username);
}

function findUserByEmail(email) {
  return db.users.find((u) => u.email === email);
}

function findUserById(id) {
  return db.users.find((u) => u.id === id);
}

function verifyPassword(password, hashedPassword) {
  return bcrypt.compareSync(password, hashedPassword);
}

function updateLastLogin(id) {
  const user = db.users.find((u) => u.id === id);
  if (user) {
    user.last_login = new Date().toISOString();
    saveDB(db);
  }
}

module.exports = {
  createUser,
  findUserByUsername,
  findUserByEmail,
  findUserById,
  verifyPassword,
  updateLastLogin
};
