const router = require("express").Router();
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

module.exports = router;
