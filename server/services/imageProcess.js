/**
 * Server-side white background removal for AI product shots (no extra deps).
 * Operates on PNG/JPEG buffers via data URI in/out.
 */
function parseDataUri(dataUri) {
  const match = dataUri.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!match) return null;
  return { ext: match[1], buffer: Buffer.from(match[2], "base64") };
}

function bufferToDataUri(buffer, mime) {
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

/**
 * Lightweight pass: re-encode not needed if we only process on client.
 * Store processing hint metadata alongside candidate.
 */
function analyzeImageBuffer(buffer) {
  return {
    sizeBytes: buffer.length,
    processedOnServer: false,
    hint: "Use client PreviewEngine for mask compositing"
  };
}

module.exports = { parseDataUri, bufferToDataUri, analyzeImageBuffer };
