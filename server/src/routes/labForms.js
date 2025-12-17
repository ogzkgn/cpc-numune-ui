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

const allowedStatuses = new Set(["DRAFT", "SUBMITTED", "WAITING_CONFIRM", "APPROVED"]);
const validateLabFormInput = ({ status, standard_no, data, lab_notes, cpc_notes, documents }) => {
  if (!status || typeof status !== "string") return "Geçersiz durum bilgisi";
  if (status && !allowedStatuses.has(status)) return null; // handled elsewhere for trip_items-only status
  if (standard_no !== undefined && standard_no !== null && typeof standard_no !== "string") return "Geçersiz standart numarası";
  if (lab_notes !== undefined && lab_notes !== null && typeof lab_notes !== "string") return "Geçersiz laboratuvar notu";
  if (cpc_notes !== undefined && cpc_notes !== null && typeof cpc_notes !== "string") return "Geçersiz CPC notu";
  if (data !== undefined && typeof data !== "object" && typeof data !== "string") return "Geçersiz form verisi";
  if (documents !== undefined && typeof documents !== "string" && !Array.isArray(documents)) return "Geçersiz doküman bilgisi";
  return null;
};

const parseJsonField = (value, fieldName) => {
  if (value === undefined || value === null || value === "") return { provided: false, value: undefined };
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return { provided: true, value: parsed };
  } catch (error) {
    throw new Error(`Invalid ${fieldName} payload`);
  }
};

const sanitizeDocuments = (docs) => {
  if (!Array.isArray(docs)) return [];
  const nowIso = new Date().toISOString();
  return docs
    .map((doc, index) => ({
      id: doc.id ?? doc.filename ?? `doc-${index}-${Date.now()}`,
      name: doc.name ?? doc.filename ?? "document",
      size: Number.isFinite(doc.size) ? Number(doc.size) : undefined,
      type: doc.type ?? doc.mimetype,
      uploadedAt: doc.uploadedAt ?? nowIso,
      url: doc.url ?? doc.downloadUrl ?? undefined
    }))
    .filter((doc) => Boolean(doc.id && doc.name));
};

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
  const validFormStatuses = new Set(["DRAFT", "SUBMITTED", "WAITING_CONFIRM", "APPROVED"]);
  const isFormStatus = validFormStatuses.has(status);
  const validationError = validateLabFormInput({ status, standard_no, data, lab_notes, cpc_notes, documents });
  if (validationError) return res.status(400).json({ error: validationError });

  let parsedData = {};
  let dataProvided = false;
  try {
    const result = parseJsonField(data, "data");
    parsedData = result.value ?? {};
    dataProvided = result.provided;
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  let parsedDocuments = documents;
  let docsProvided = false;
  try {
    const result = parseJsonField(documents, "documents");
    parsedDocuments = result.value;
    docsProvided = result.provided;
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
  const safeDocuments = docsProvided ? sanitizeDocuments(parsedDocuments) : undefined;
  const jsonDocuments = docsProvided ? JSON.stringify(safeDocuments ?? []) : null;
  const labNotesProvided = lab_notes !== undefined;
  const cpcNotesProvided = cpc_notes !== undefined;
  const standardProvided = standard_no !== undefined;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Allow updating only trip_items.lab_status with non-form statuses (e.g., ACCEPTED) without touching lab_forms
    if (!isFormStatus) {
      const existingForm = await client.query("SELECT * FROM lab_forms WHERE trip_item_id = $1", [tripItemId]);
      await client.query(
        `UPDATE trip_items
           SET lab_status = $2,
               updated_at = NOW()
         WHERE id = $1`,
        [tripItemId, status]
      );
      await client.query("COMMIT");
      if (existingForm.rowCount > 0) {
        return res.json(mapLabFormRow(existingForm.rows[0]));
      }
      return res.json({ tripItemId, status });
    }

    const existing = await client.query("SELECT id FROM lab_forms WHERE trip_item_id = $1", [tripItemId]);

    const formResult =
      existing.rowCount === 0
        ? await client.query(
            `INSERT INTO lab_forms (trip_item_id, status, standard_no, data, lab_notes, cpc_notes, documents)
             VALUES ($1, $2, $3, COALESCE($4::jsonb,'{}'::jsonb), $5, $6, COALESCE($7::jsonb,'[]'::jsonb))
             RETURNING *`,
            [
              tripItemId,
              status,
              standardProvided ? standard_no : null,
              dataProvided ? JSON.stringify(parsedData ?? {}) : null,
              labNotesProvided ? lab_notes ?? null : null,
              cpcNotesProvided ? cpc_notes ?? null : null,
              docsProvided ? jsonDocuments : null
            ]
          )
        : await client.query(
            `UPDATE lab_forms
               SET status = $2,
                   standard_no = CASE WHEN $3 THEN $4 ELSE standard_no END,
                   data = CASE WHEN $5 THEN COALESCE($6::jsonb, '{}'::jsonb) ELSE data END,
                   lab_notes = CASE WHEN $7 THEN $8 ELSE lab_notes END,
                   cpc_notes = CASE WHEN $9 THEN $10 ELSE cpc_notes END,
                   documents = CASE WHEN $11 THEN COALESCE($12::jsonb, '[]'::jsonb) ELSE documents END,
                   updated_at = NOW()
             WHERE trip_item_id = $1
             RETURNING *`,
            [
              tripItemId,
              status,
              standardProvided,
              standard_no ?? null,
              dataProvided,
              dataProvided ? JSON.stringify(parsedData ?? {}) : null,
              labNotesProvided,
              lab_notes ?? null,
              cpcNotesProvided,
              cpc_notes ?? null,
              docsProvided,
              docsProvided ? jsonDocuments : null
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
const allowedMimeTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "image/png",
  "image/jpeg"
]);
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
      const timestamp = Date.now();
      const safeName = file.originalname.replace(/\s+/g, "_");
      cb(null, `${timestamp}-${safeName}`);
    }
  }),
  fileFilter: (_req, file, cb) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      return cb(new Error("Desteklenmeyen dosya türü"), false);
    }
    cb(null, true);
  },
  limits: { fileSize: 15 * 1024 * 1024 } // 15 MB per file
});

const uploadMiddleware = (req, res, next) =>
  upload.array("files", 10)(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || "Dosya yüklenemedi" });
    }
    next();
  });

router.post("/:tripItemId/upload", uploadMiddleware, async (req, res) => {
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
  const validationError = validateLabFormInput({ status, standard_no, data, lab_notes, cpc_notes, documents: existingDocsJson });
  if (validationError) return res.status(400).json({ error: validationError });
  if (!status) return res.status(400).json({ error: "status is required" });

  let existingDocs = [];
  if (existingDocsJson) {
    try {
      existingDocs = JSON.parse(existingDocsJson);
    } catch (_err) {
      return res.status(400).json({ error: "Invalid documents payload" });
    }
  }
  existingDocs = sanitizeDocuments(existingDocs);
  const uploadedDocs =
    (req.files ?? []).map((file) => ({
      id: file.filename,
      name: file.originalname,
      size: file.size,
      type: file.mimetype,
      uploadedAt: new Date().toISOString(),
      url: `/uploads/lab-forms/${file.filename}`
    })) ?? [];
  const mergedDocs = sanitizeDocuments([...existingDocs, ...uploadedDocs]);
  const jsonDocs = JSON.stringify(mergedDocs ?? []);

  let parsedData = {};
  let dataProvided = false;
  try {
    const result = parseJsonField(data, "data");
    parsedData = result.value ?? {};
    dataProvided = result.provided;
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
  const labNotesProvided = lab_notes !== undefined;
  const cpcNotesProvided = cpc_notes !== undefined;
  const standardProvided = standard_no !== undefined;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const existing = await client.query("SELECT id FROM lab_forms WHERE trip_item_id = $1", [tripItemId]);

    const formResult =
      existing.rowCount === 0
        ? await client.query(
            `INSERT INTO lab_forms (trip_item_id, status, standard_no, data, lab_notes, cpc_notes, documents)
             VALUES ($1, $2, $3, COALESCE($4::jsonb, '{}'::jsonb), $5, $6, COALESCE($7::jsonb, '[]'::jsonb))
             RETURNING *`,
            [
              tripItemId,
              status,
              standardProvided ? standard_no : null,
              dataProvided ? JSON.stringify(parsedData ?? {}) : null,
              labNotesProvided ? lab_notes ?? null : null,
              cpcNotesProvided ? cpc_notes ?? null : null,
              jsonDocs
            ]
          )
        : await client.query(
            `UPDATE lab_forms
               SET status = $2,
                   standard_no = CASE WHEN $3 THEN $4 ELSE standard_no END,
                   data = CASE WHEN $5 THEN COALESCE($6::jsonb, '{}'::jsonb) ELSE data END,
                   lab_notes = CASE WHEN $7 THEN $8 ELSE lab_notes END,
                   cpc_notes = CASE WHEN $9 THEN $10 ELSE cpc_notes END,
                   documents = CASE WHEN $11 THEN COALESCE($12::jsonb, '[]'::jsonb) ELSE documents END,
                   updated_at = NOW()
             WHERE trip_item_id = $1
             RETURNING *`,
            [
              tripItemId,
              status,
              standardProvided,
              standard_no ?? null,
              dataProvided,
              dataProvided ? JSON.stringify(parsedData ?? {}) : null,
              labNotesProvided,
              lab_notes ?? null,
              cpcNotesProvided,
              cpc_notes ?? null,
              true,
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
