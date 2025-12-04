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

  const { status, standard_no, data, lab_notes, cpc_notes, documents } = req.body || {};
  if (!status) return res.status(400).json({ error: "status is required" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const formResult = await client.query(
      `INSERT INTO lab_forms (trip_item_id, status, standard_no, data, lab_notes, cpc_notes, documents)
       VALUES ($1, $2, $3, COALESCE($4,'{}'::jsonb), $5, $6, $7)
       ON CONFLICT (trip_item_id) DO UPDATE SET
         status = EXCLUDED.status,
         standard_no = EXCLUDED.standard_no,
         data = EXCLUDED.data,
         lab_notes = EXCLUDED.lab_notes,
         cpc_notes = EXCLUDED.cpc_notes,
         documents = EXCLUDED.documents,
         updated_at = NOW()
       RETURNING *`,
      [tripItemId, status, standard_no ?? null, data ?? {}, lab_notes ?? null, cpc_notes ?? null, documents ?? null]
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
  const uploadedDocs =
    (req.files ?? []).map((file) => ({
      id: file.filename,
      name: file.originalname,
      size: file.size,
      type: file.mimetype,
      uploadedAt: new Date().toISOString(),
      url: `/uploads/lab-forms/${file.filename}`
    })) ?? [];
  const mergedDocs = [...existingDocs, ...uploadedDocs];

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
       VALUES ($1, $2, $3, COALESCE($4,'{}'::jsonb), $5, $6, $7)
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
        JSON.stringify(mergedDocs)
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
