const { run, get, all, runReturning } = require("../db/database");

function createContact(data) {
  const id = runReturning(
    "INSERT INTO contacts (name, email, subject, message, status, created_at) VALUES (?, ?, ?, ?, 'new', ?)",
    [data.name, data.email, data.subject || "", data.message, new Date().toISOString()]
  );
  return getContactById(id);
}

function getContactById(id) {
  const row = get("SELECT * FROM contacts WHERE id = ?", [id]);
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    subject: row.subject,
    message: row.message,
    status: row.status,
    createdAt: row.created_at
  };
}

function listContacts(status) {
  let sql = "SELECT * FROM contacts";
  const params = [];
  if (status) {
    sql += " WHERE status = ?";
    params.push(status);
  }
  sql += " ORDER BY created_at DESC";
  return all(sql, params).map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    subject: row.subject,
    message: row.message,
    status: row.status,
    createdAt: row.created_at
  }));
}

function updateContactStatus(id, status) {
  run("UPDATE contacts SET status = ? WHERE id = ?", [status, id]);
  return getContactById(id);
}

module.exports = { createContact, getContactById, listContacts, updateContactStatus };
