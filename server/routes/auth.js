const express = require("express");
const jwt = require("jsonwebtoken");
const { createUser, findUserByUsername, findUserByEmail, verifyPassword, updateLastLogin } = require("../db");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "river-magnet-secret-key-2024";
const JWT_EXPIRES_IN = "7d";

router.post("/register", (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: "请填写所有必填字段" });
  }

  if (username.length < 3 || username.length > 20) {
    return res.status(400).json({ error: "用户名长度需在 3-20 个字符之间" });
  }

  if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/.test(username)) {
    return res.status(400).json({ error: "用户名只能包含字母、数字、下划线和中文" });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: "密码长度至少为 6 个字符" });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "请输入有效的邮箱地址" });
  }

  const result = createUser(username, email, password);

  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  const user = { id: result.userId, username, email };
  const token = jwt.sign(user, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

  res.status(201).json({
    message: "注册成功",
    user: { id: user.id, username: user.username, email: user.email },
    token
  });
});

router.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "请填写用户名和密码" });
  }

  let user = findUserByUsername(username);

  if (!user) {
    const emailUser = findUserByEmail(username);
    if (emailUser) {
      user = emailUser;
    }
  }

  if (!user) {
    return res.status(401).json({ error: "用户名或密码错误" });
  }

  if (!verifyPassword(password, user.password)) {
    return res.status(401).json({ error: "用户名或密码错误" });
  }

  updateLastLogin(user.id);

  const userInfo = { id: user.id, username: user.username, email: user.email };
  const token = jwt.sign(userInfo, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

  res.json({
    message: "登录成功",
    user: userInfo,
    token
  });
});

router.get("/me", (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "未登录" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({
      user: {
        id: decoded.id,
        username: decoded.username,
        email: decoded.email
      }
    });
  } catch (error) {
    return res.status(401).json({ error: "登录已过期，请重新登录" });
  }
});

router.post("/logout", (req, res) => {
  res.json({ message: "已退出登录" });
});

module.exports = router;
