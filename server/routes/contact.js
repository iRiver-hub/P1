const express = require("express");
const contactStore = require("../services/contactStore");

const router = express.Router();

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

  const entry = contactStore.createContact({ name, email, subject, message });

  res.status(201).json({ message: "Message sent successfully! We will get back to you soon.", contact: entry });
});

module.exports = router;
