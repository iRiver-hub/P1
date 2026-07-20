const { runReturning, all } = require("../db/database");

function log(actor, action, entityType, entityId, details) {
  runReturning(
    "INSERT INTO audit_logs (actor, action, entity_type, entity_id, details, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    [actor || "system", action, entityType || "", String(entityId || ""), JSON.stringify(details || {}), new Date().toISOString()]
  );
}

function listRecent(limit = 50) {
  return all("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?", [limit]).map((row) => ({
    id: row.id,
    actor: row.actor,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    details: JSON.parse(row.details || "{}"),
    createdAt: row.created_at
  }));
}

module.exports = { log, listRecent };
