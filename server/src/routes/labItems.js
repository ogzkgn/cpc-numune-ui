const router = require("express").Router();
const { pool } = require("../db/client");

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

router.get("/", async (req, res) => {
  const { status } = req.query; // optional filters: processing/inbox
  try {
    const whereClauses = [];
    const params = [];
    if (req.user?.role === "lab" && req.user.labId) {
      params.push(req.user.labId);
      whereClauses.push(`ti.lab_assigned_lab_id = $${params.length}`);
    }
    if (status === "processing") {
      whereClauses.push("ti.lab_sent_at IS NOT NULL");
      whereClauses.push("ti.lab_status NOT IN ('ACCEPTED','APPROVED','WAITING_CONFIRM')");
    } else if (status === "inbox") {
      whereClauses.push("ti.lab_status IN ('ACCEPTED','APPROVED','WAITING_CONFIRM')");
    }
    const where = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";

    const tripItemsResult = await pool.query(
      `SELECT ti.*, cp.company_name, cp.bt_code, cp.product_name, cp.product_type, cp.product_code, p.standard_no
       FROM trip_items ti
       JOIN company_products cp ON cp.id = ti.company_product_id
       LEFT JOIN products p ON p.id = cp.product_id
       ${where}
       ORDER BY ti.lab_sent_at DESC NULLS LAST, ti.id DESC`,
      params
    );

    const tripItemIds = tripItemsResult.rows.map((row) => row.id);
    let formsResult = { rows: [] };
    if (tripItemIds.length > 0) {
      const placeholders = tripItemIds.map((_, index) => `$${index + 1}`).join(", ");
      formsResult = await pool.query(`SELECT * FROM lab_forms WHERE trip_item_id IN (${placeholders})`, tripItemIds);
    }

    res.json({
      tripItems: tripItemsResult.rows.map((row) => ({
        ...mapTripItemRow(row),
        companyName: row.company_name,
        companyBtCode: row.bt_code ?? undefined,
        productName: row.product_name,
        productType: row.product_type,
        productCode: row.product_code,
        productStandard: row.standard_no ?? undefined
      })),
      labForms: formsResult.rows.map(mapLabFormRow)
    });
  } catch (error) {
    console.error("Failed to fetch lab items:", error);
    res.status(500).json({ error: "Failed to fetch lab items" });
  }
});

module.exports = router;
