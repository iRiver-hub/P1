const express = require("express");
const fs = require("fs");
const path = require("path");
const router = express.Router();

const CONTACTS_FILE = path.join(__dirname, "..", "contacts.json");

function loadContacts() {
  try {
    if (fs.existsSync(CONTACTS_FILE)) {
      return JSON.parse(fs.readFileSync(CONTACTS_FILE, "utf8"));
    }
  } catch (e) {
    console.error("Error loading contacts:", e.message);
  }
  return [];
}

function saveContacts(data) {
  fs.writeFileSync(CONTACTS_FILE, JSON.stringify(data, null, 2), "utf8");
}

router.post("/", (req, res) => {
  const { name, email, subject, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: "Please fill in name, email, and message" });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Please enter a valid email address" });
  }

  if (message.length < 10) {
    return res.status(400).json({ error: "Message must be at least 10 characters" });
  }

  const contacts = loadContacts();
  const entry = {
    id: contacts.length + 1,
    name,
    email,
    subject: subject || "",
    message,
    createdAt: new Date().toISOString()
  };

  contacts.push(entry);
  saveContacts(contacts);

  res.status(201).json({ message: "Message sent successfully! We will get back to you soon." });
});

module.exports = router;