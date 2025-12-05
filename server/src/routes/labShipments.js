const router = require("express").Router();
const { pool } = require("../db/client");

const mapShipmentRow = (row) => ({
  id: row.id,
  tripItemId: row.trip_item_id,
  labId: row.lab_id,
  labEntryCode: row.lab_entry_code,
  sentAt: row.sent_at,
    sealNo: row.seal_no,
    weight: row.weight,
    cpcNote: row.cpc_note,
    createdAt: row.created_at,
    updatedAt: row.updated_at
});

const mapTripItemRow = (row) => ({
  id: row.id,
  tripId: row.trip_id,
  companyProductId: row.company_product_id,
  dutyType: row.duty_type,
  dutyAssigneeIds: row.duty_assignee_ids ?? [],
  sampled: row.sampled ?? false,
  sampledAt: row.sampled_at ?? undefined,
  labStatus: row.lab_status ?? undefined,
  labSentAt: row.lab_sent_at ?? undefined,
  labAssignedLabId: row.lab_assigned_lab_id ?? undefined,
  labShipmentDetails: row.lab_shipment_details ?? undefined,
  labEntryCode: row.lab_entry_code ?? undefined
});

// Pending samples to send to lab
router.get("/pending", async (req, res) => {
  try {
    const params = [];
    let labFilter = "";
    if (req.user?.role === "lab" && req.user.labId) {
      params.push(req.user.labId);
      labFilter = "AND ti.lab_assigned_lab_id = $1";
    }

    const result = await pool.query(
      `SELECT
         ti.id AS trip_item_id,
         ti.trip_id,
         ti.company_product_id,
         ti.lab_status,
         ti.lab_entry_code,
         e.performed_at,
         e.tracking_code,
         e.duty_type,
         cp.company_name,
         cp.bt_code,
         cp.product_name,
         cp.product_code,
         cp.location
       FROM trip_completion_entries e
       JOIN trip_completions c ON c.id = e.trip_completion_id
       JOIN trips t ON t.id = c.trip_id
       JOIN trip_items ti ON ti.trip_id = t.id AND ti.company_product_id = e.company_product_id
       JOIN company_products cp ON cp.id = e.company_product_id
       LEFT JOIN lab_shipments ls ON ls.trip_item_id = ti.id
       WHERE t.status = 'COMPLETED'
         AND (e.duty_type = 'NUMUNE' OR e.duty_type = 'BOTH')
         AND (e.sample_not_completed IS DISTINCT FROM TRUE)
         AND e.performed_at IS NOT NULL
         AND ls.id IS NULL
         AND (ti.lab_status IS NULL OR ti.lab_status = 'PENDING')
         ${labFilter}
       ORDER BY e.performed_at DESC, ti.id DESC`,
      params
    );

    const rows = result.rows.map((row) => ({
      tripItemId: row.trip_item_id,
      tripId: row.trip_id,
      companyProductId: row.company_product_id,
      performedAt: row.performed_at,
      trackingCode: row.tracking_code ?? row.lab_entry_code ?? undefined,
      dutyType: row.duty_type,
      companyName: row.company_name,
      companyBtCode: row.bt_code ?? undefined,
      productName: row.product_name,
      productCode: row.product_code ?? undefined,
      location: row.location ?? undefined,
      labStatus: row.lab_status ?? undefined
    }));

    res.json(rows);
  } catch (error) {
    console.error("Failed to fetch pending lab shipments:", error);
    res.status(500).json({ error: "Failed to fetch pending lab shipments" });
  }
});

// Upsert shipment and update trip item lab status/details
router.put("/:tripItemId", async (req, res) => {
  const tripItemId = Number(req.params.tripItemId);
  if (!tripItemId) return res.status(400).json({ error: "Valid tripItemId is required" });

  const {
    lab_id,
    lab_entry_code,
    sent_at,
    seal_no,
    weight,
    cpc_note,
    lab_status
  } = req.body || {};

  if (!lab_id || !lab_entry_code || !seal_no) {
    return res.status(400).json({ error: "lab_id, lab_entry_code and seal_no are required" });
  }
  if (req.user?.role === "lab" && req.user.labId && req.user.labId !== Number(lab_id)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const client = await pool.connect();
  try {
    const tripItemResult = await client.query("SELECT * FROM trip_items WHERE id = $1", [tripItemId]);
    if (tripItemResult.rowCount === 0) {
      return res.status(404).json({ error: "Trip item not found" });
    }
    if (req.user?.role === "lab" && req.user.labId) {
      const assigned = tripItemResult.rows[0].lab_assigned_lab_id;
      if (assigned !== req.user.labId) {
        return res.status(403).json({ error: "Forbidden" });
      }
    }

    await client.query("BEGIN");

    const shipmentResult = await client.query(
      `INSERT INTO lab_shipments (
         trip_item_id,
         lab_id,
         lab_entry_code,
         sent_at,
         seal_no,
         weight,
         cpc_note
       ) VALUES ($1,$2,$3,COALESCE($4, NOW()),$5,$6,$7)
       ON CONFLICT (trip_item_id) DO UPDATE SET
         lab_id = EXCLUDED.lab_id,
         lab_entry_code = EXCLUDED.lab_entry_code,
         sent_at = EXCLUDED.sent_at,
         seal_no = EXCLUDED.seal_no,
         weight = EXCLUDED.weight,
         cpc_note = EXCLUDED.cpc_note,
         updated_at = NOW()
       RETURNING *`,
      [
        tripItemId,
        lab_id,
        lab_entry_code,
        sent_at ?? null,
        seal_no,
        weight ?? null,
        cpc_note ?? null
      ]
    );

    const shipmentDetails = {
      sealNo: seal_no,
      weight: weight ?? "",
      cpcNote: cpc_note ?? ""
    };

    const tripItemUpdate = await client.query(
      `UPDATE trip_items
         SET lab_status = COALESCE($2, 'SUBMITTED'),
             lab_sent_at = COALESCE($3, lab_sent_at, NOW()),
             lab_assigned_lab_id = $4,
             lab_shipment_details = $5::jsonb,
             lab_entry_code = COALESCE($6, lab_entry_code),
             updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [tripItemId, lab_status ?? null, sent_at ?? null, lab_id, JSON.stringify(shipmentDetails), lab_entry_code]
    );

    await client.query("COMMIT");

    res.json({ shipment: mapShipmentRow(shipmentResult.rows[0]), tripItem: mapTripItemRow(tripItemUpdate.rows[0]) });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Failed to save lab shipment:", error);
    res.status(500).json({ error: "Failed to save lab shipment" });
  } finally {
    client.release();
  }
});

module.exports = router;
