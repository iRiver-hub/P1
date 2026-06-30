const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const IMAGES_DIR = path.join(DATA_DIR, "images");
const DB_FILE = path.join(DATA_DIR, "designs-db.json");

function ensureDirs() {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

function loadDB() {
  ensureDirs();
  try {
    if (fs.existsSync(DB_FILE)) {
      return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
    }
  } catch (e) {
    console.error("designStore load error:", e.message);
  }
  return { sessions: [], designs: [], nextSessionId: 1, nextCandidateId: 1, nextDesignId: 1 };
}

function saveDB(db) {
  ensureDirs();
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf8");
}

function sessionDir(sessionId) {
  return path.join(IMAGES_DIR, String(sessionId));
}

function saveDataUri(sessionId, filename, dataUri) {
  const dir = sessionDir(sessionId);
  fs.mkdirSync(dir, { recursive: true });
  const match = dataUri.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!match) throw new Error("Invalid image data URI");
  const ext = match[1] === "jpeg" ? "jpg" : match[1];
  const baseName = filename.replace(/\.[^.]+$/, "") + "." + ext;
  const filePath = path.join(dir, baseName);
  fs.writeFileSync(filePath, Buffer.from(match[2], "base64"));
  return baseName;
}

function readImageAsDataUri(sessionId, filename) {
  const filePath = path.join(sessionDir(sessionId), filename);
  if (!fs.existsSync(filePath)) return null;
  const buf = fs.readFileSync(filePath);
  const ext = path.extname(filename).slice(1).toLowerCase();
  const mime = ext === "jpg" ? "jpeg" : ext;
  return `data:image/${mime};base64,${buf.toString("base64")}`;
}

function createSession(userId) {
  const db = loadDB();
  const session = {
    id: db.nextSessionId++,
    userId: userId || null,
    status: "draft",
    styleId: null,
    dim: "3d",
    originalImage: null,
    candidates: [],
    confirmedDesignId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  db.sessions.push(session);
  saveDB(db);
  return session;
}

function getSession(sessionId) {
  const db = loadDB();
  return db.sessions.find((s) => s.id === parseInt(sessionId, 10)) || null;
}

function updateSession(sessionId, patch) {
  const db = loadDB();
  const session = db.sessions.find((s) => s.id === parseInt(sessionId, 10));
  if (!session) return null;
  Object.assign(session, patch, { updatedAt: new Date().toISOString() });
  saveDB(db);
  return session;
}

function addCandidate(sessionId, imageFilename, styleId, dim) {
  const db = loadDB();
  const session = db.sessions.find((s) => s.id === parseInt(sessionId, 10));
  if (!session) return null;
  const candidate = {
    id: db.nextCandidateId++,
    imageFilename,
    styleId,
    dim,
    createdAt: new Date().toISOString()
  };
  session.candidates.push(candidate);
  session.updatedAt = new Date().toISOString();
  saveDB(db);
  return candidate;
}

function confirmDesign(sessionId, candidateId, userId) {
  const db = loadDB();
  const session = db.sessions.find((s) => s.id === parseInt(sessionId, 10));
  if (!session) return { success: false, error: "Session not found" };

  const candidate = session.candidates.find((c) => c.id === parseInt(candidateId, 10));
  if (!candidate) return { success: false, error: "Candidate not found" };

  if (session.status === "confirmed" && session.confirmedDesignId) {
    return { success: false, error: "Design already confirmed for this session" };
  }

  const design = {
    id: db.nextDesignId++,
    sessionId: session.id,
    userId,
    candidateId: candidate.id,
    styleId: candidate.styleId,
    dim: candidate.dim,
    previewImage: candidate.imageFilename,
    status: "confirmed",
    lockedAt: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };

  db.designs.push(design);
  session.status = "confirmed";
  session.confirmedDesignId = design.id;
  session.userId = userId;
  session.updatedAt = new Date().toISOString();
  saveDB(db);

  return { success: true, design };
}

function getDesign(designId) {
  const db = loadDB();
  return db.designs.find((d) => d.id === parseInt(designId, 10)) || null;
}

function getDesignForUser(designId, userId) {
  const design = getDesign(designId);
  if (!design || design.userId !== userId) return null;
  return design;
}

function listDesignsForAdmin() {
  const db = loadDB();
  return db.designs.map((d) => ({
    id: d.id,
    sessionId: d.sessionId,
    userId: d.userId,
    styleId: d.styleId,
    dim: d.dim,
    status: d.status,
    lockedAt: d.lockedAt
  }));
}

function listSessionsForAdmin() {
  const db = loadDB();
  return db.sessions.map((s) => ({
    id: s.id,
    userId: s.userId,
    status: s.status,
    styleId: s.styleId,
    candidateCount: s.candidates.length,
    confirmedDesignId: s.confirmedDesignId,
    createdAt: s.createdAt
  }));
}

module.exports = {
  createSession,
  getSession,
  updateSession,
  addCandidate,
  confirmDesign,
  getDesign,
  getDesignForUser,
  saveDataUri,
  readImageAsDataUri,
  listDesignsForAdmin,
  listSessionsForAdmin,
  sessionDir,
  IMAGES_DIR
};
