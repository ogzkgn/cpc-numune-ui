const router = require("express").Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { pool } = require("../db/client");

const mapLabFormRow = (row) => ({
  id: row.id,
  tripItemId: row.trip_item_id,
  status: row.status,
  standardNo: row.standard_no ?? undefined,
  data: row.data ?? {},
  labNotes: row.lab_notes ?? undefined,
  cpcNotes: row.cpc_notes ?? undefined,
  documents: row.documents ?? undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

router.put("/:tripItemId", async (req, res) => {
  const tripItemId = Number(req.params.tripItemId);
  if (!tripItemId) return res.status(400).json({ error: "Valid tripItemId is required" });
  if (req.user?.role === "lab" && req.user.labId) {
    const check = await pool.query("SELECT lab_assigned_lab_id FROM trip_items WHERE id = $1", [tripItemId]);
    if (check.rowCount === 0) return res.status(404).json({ error: "Trip item not found" });
    if (check.rows[0].lab_assigned_lab_id !== req.user.labId) {
      return res.status(403).json({ error: "Forbidden" });
    }
  }

  const { status, standard_no, data, lab_notes, cpc_notes, documents } = req.body || {};
  if (!status) return res.status(400).json({ error: "status is required" });

  let parsedData = {};
  if (data) {
    try {
      parsedData = typeof data === "string" ? JSON.parse(data) : data;
    } catch (parseError) {
      console.warn("Failed to parse form data JSON, defaulting to {}:", parseError);
      parsedData = {};
    }
  }

  let parsedDocuments = documents;
  if (typeof documents === "string") {
    try {
      parsedDocuments = JSON.parse(documents);
    } catch (parseError) {
      console.warn("Failed to parse documents JSON, defaulting to null:", parseError);
      parsedDocuments = null;
    }
  }
  const safeDocuments = Array.isArray(parsedDocuments)
    ? parsedDocuments.map((doc) => ({
        id: doc.id,
        name: doc.name,
        size: doc.size,
        type: doc.type,
        uploadedAt: doc.uploadedAt ?? new Date().toISOString(),
        url: doc.url,
        dataUrl: doc.dataUrl
      }))
    : [];
  let jsonDocuments = "[]";
  try {
    jsonDocuments = JSON.stringify(safeDocuments ?? []);
  } catch (_err) {
    jsonDocuments = "[]";
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const formResult = await client.query(
      `INSERT INTO lab_forms (trip_item_id, status, standard_no, data, lab_notes, cpc_notes, documents)
       VALUES ($1, $2, $3, COALESCE($4,'{}'::jsonb), $5, $6, $7::jsonb)
       ON CONFLICT (trip_item_id) DO UPDATE SET
         status = EXCLUDED.status,
        standard_no = EXCLUDED.standard_no,
        data = EXCLUDED.data,
        lab_notes = EXCLUDED.lab_notes,
        cpc_notes = EXCLUDED.cpc_notes,
        documents = EXCLUDED.documents,
        updated_at = NOW()
       RETURNING *`,
      [
        tripItemId,
        status,
        standard_no ?? null,
        parsedData ?? {},
        lab_notes ?? null,
        cpc_notes ?? null,
        jsonDocuments
      ]
    );

    // Mirror status to trip_items
    await client.query(
      `UPDATE trip_items
         SET lab_status = $2,
             updated_at = NOW()
       WHERE id = $1`,
      [tripItemId, status]
    );

    await client.query("COMMIT");
    res.json(mapLabFormRow(formResult.rows[0]));
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Failed to save lab form:", error);
    res.status(500).json({ error: "Failed to save lab form" });
  } finally {
    client.release();
  }
});

// Multipart upload for lab form with documents
// Save uploads under server/uploads/lab-forms (static path exposed in server.js)
const uploadDir = path.join(__dirname, "../../uploads/lab-forms");
fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
      const timestamp = Date.now();
      const safeName = file.originalname.replace(/\s+/g, "_");
      cb(null, `${timestamp}-${safeName}`);
    }
  }),
  limits: { fileSize: 15 * 1024 * 1024 } // 15 MB per file
});

router.post("/:tripItemId/upload", upload.array("files", 10), async (req, res) => {
  const tripItemId = Number(req.params.tripItemId);
  if (!tripItemId) return res.status(400).json({ error: "Valid tripItemId is required" });
  if (req.user?.role === "lab" && req.user.labId) {
    const check = await pool.query("SELECT lab_assigned_lab_id FROM trip_items WHERE id = $1", [tripItemId]);
    if (check.rowCount === 0) return res.status(404).json({ error: "Trip item not found" });
    if (check.rows[0].lab_assigned_lab_id !== req.user.labId) {
      return res.status(403).json({ error: "Forbidden" });
    }
  }

  const { status, standard_no, data, lab_notes, cpc_notes, documents: existingDocsJson } = req.body || {};
  if (!status) return res.status(400).json({ error: "status is required" });

  let existingDocs = [];
  if (existingDocsJson) {
    try {
      existingDocs = JSON.parse(existingDocsJson);
    } catch (parseError) {
      console.warn("Failed to parse existing docs payload, defaulting to []:", parseError);
      existingDocs = [];
    }
  }
  const sanitizeDocsArray = (docs) =>
    Array.isArray(docs)
      ? docs.map((doc) => ({
          id: doc.id,
          name: doc.name,
          size: doc.size,
          type: doc.type,
          uploadedAt: doc.uploadedAt ?? new Date().toISOString(),
          url: doc.url,
          dataUrl: doc.dataUrl
        }))
      : [];
  existingDocs = sanitizeDocsArray(existingDocs);
  const uploadedDocs =
    (req.files ?? []).map((file) => ({
      id: file.filename,
      name: file.originalname,
      size: file.size,
      type: file.mimetype,
      uploadedAt: new Date().toISOString(),
      url: `/uploads/lab-forms/${file.filename}`
    })) ?? [];
  const mergedDocs = sanitizeDocsArray([...existingDocs, ...uploadedDocs]);

  const finalizeDocs = (docs) => {
    if (typeof docs === "string") {
      try {
        const parsed = JSON.parse(docs);
        return sanitizeDocsArray(parsed);
      } catch (_err) {
        return [];
      }
    }
    if (Array.isArray(docs)) return sanitizeDocsArray(docs);
    return [];
  };
  const finalDocs = finalizeDocs(mergedDocs);
  // Deep-clone to drop undefined values and ensure plain JSON
  let safeDocs = [];
  try {
    safeDocs = JSON.parse(JSON.stringify(finalDocs ?? []));
  } catch (_err) {
    safeDocs = [];
  }
  let jsonDocs = "[]";
  try {
    jsonDocs = JSON.stringify(safeDocs ?? []);
  } catch (_err) {
    jsonDocs = "[]";
  }

  let parsedData = {};
  if (data) {
    try {
      parsedData = typeof data === "string" ? JSON.parse(data) : data;
    } catch (parseError) {
      console.warn("Failed to parse form data JSON, defaulting to {}:", parseError);
      parsedData = {};
    }
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const formResult = await client.query(
      `INSERT INTO lab_forms (trip_item_id, status, standard_no, data, lab_notes, cpc_notes, documents)
       VALUES ($1, $2, $3, COALESCE($4,'{}'::jsonb), $5, $6, $7::jsonb)
       ON CONFLICT (trip_item_id) DO UPDATE SET
         status = EXCLUDED.status,
         standard_no = EXCLUDED.standard_no,
         data = EXCLUDED.data,
         lab_notes = EXCLUDED.lab_notes,
         cpc_notes = EXCLUDED.cpc_notes,
         documents = EXCLUDED.documents,
         updated_at = NOW()
       RETURNING *`,
      [
        tripItemId,
        status,
        standard_no ?? null,
        parsedData ?? {},
        lab_notes ?? null,
        cpc_notes ?? null,
        jsonDocs
      ]
    );

    await client.query(
      `UPDATE trip_items
         SET lab_status = $2,
             updated_at = NOW()
       WHERE id = $1`,
      [tripItemId, status]
    );

    await client.query("COMMIT");
    res.json(mapLabFormRow(formResult.rows[0]));
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Failed to save lab form with upload:", error);
    res.status(500).json({ error: "Failed to save lab form" });
  } finally {
    client.release();
  }
});

module.exports = router;
