const router = require("express").Router();
const { pool } = require("../db/client");

const mapTripRow = (row) => ({
  id: row.id,
  name: row.name,
  plannedAt: row.planned_at,
  status: row.status,
  assigneeIds: row.assignee_ids ?? [],
  notes: row.notes,
  plannedBy: row.planned_by,
  transportMode: row.transport_mode,
  vehiclePlate: row.vehicle_plate,
  lodgingProvider: row.lodging_provider
});

const mapDutyRow = (row) => ({
  id: row.id,
  tripId: row.trip_id,
  companyProductId: row.company_product_id,
  dutyType: row.duty_type,
  dutyAssigneeIds: row.duty_assignee_ids ?? []
});

const mapCompletionRow = (row) => ({
  id: row.id,
  tripId: row.trip_id,
  completedByEmployeeIds: row.completed_by_employee_ids ?? [],
  transportMode: row.transport_mode,
  vehiclePlate: row.vehicle_plate,
  totalKm: row.total_km,
  totalDays: row.total_days,
  lodgingProvider: row.lodging_provider,
  createdAt: row.created_at
});

const mapCompletionEntryRow = (row) => ({
  id: row.id,
  companyProductId: row.company_product_id,
  dutyType: row.duty_type,
  dutyAssigneeIds: row.duty_assignee_ids ?? [],
  performedAt: row.performed_at,
  inspectedAt: row.inspected_at,
  sampleNotCompleted: row.sample_not_completed ?? undefined,
  inspectionNotCompleted: row.inspection_not_completed ?? undefined,
  trackingCode: row.tracking_code ?? undefined,
  lodgingPaymentAmount: row.lodging_payment_amount ?? undefined,
  transportExpense: row.transport_expense ?? undefined,
  mealLunchExpense: row.meal_lunch_expense ?? undefined,
  mealDinnerExpense: row.meal_dinner_expense ?? undefined,
  companyExpense: row.company_expense ?? undefined
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

router.get("/", async (req, res) => {
  try {
    const params = [];
    const whereClauses = [];
    if (req.user?.role === "lab" && req.user.labId) {
      params.push(req.user.labId);
      whereClauses.push(
        `EXISTS (
           SELECT 1 FROM trip_items ti
           WHERE ti.trip_id = t.id AND ti.lab_assigned_lab_id = $${params.length}
         )`
      );
    }
    const where = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";

    const result = await pool.query(
      `SELECT
         t.*,
         COALESCE(json_agg(DISTINCT d.*) FILTER (WHERE d.id IS NOT NULL), '[]') AS duties,
         COALESCE(json_agg(DISTINCT ti.*) FILTER (WHERE ti.id IS NOT NULL), '[]') AS items
       FROM trips t
       LEFT JOIN trip_duty_assignments d ON d.trip_id = t.id
       LEFT JOIN trip_items ti ON ti.trip_id = t.id
       ${where}
       GROUP BY t.id
       ORDER BY t.planned_at DESC`,
      params
    );

    const trips = result.rows.map((row) => ({
      ...mapTripRow(row),
      duties: Array.isArray(row.duties) ? row.duties.map(mapDutyRow) : [],
      items: Array.isArray(row.items) ? row.items.map(mapTripItemRow) : []
    }));

    res.json(trips);
  } catch (error) {
    console.error("Failed to fetch trips:", error);
    res.status(500).json({ error: "Failed to fetch trips" });
  }
});

router.post("/", async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      name,
      planned_at,
      status = "ACTIVE",
      assignee_ids = [],
      notes,
      planned_by,
      transport_mode,
      vehicle_plate,
      lodging_provider,
      duties = []
    } = req.body || {};

    await client.query("BEGIN");
    const tripResult = await client.query(
      `INSERT INTO trips (name, planned_at, status, assignee_ids, notes, planned_by, transport_mode, vehicle_plate, lodging_provider)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        name ?? null,
        planned_at ?? new Date().toISOString(),
        status,
        assignee_ids,
        notes ?? null,
        planned_by ?? null,
        transport_mode ?? null,
        vehicle_plate ?? null,
        lodging_provider ?? null
      ]
    );

    const trip = mapTripRow(tripResult.rows[0]);

    let insertedDuties = [];
    let insertedItems = [];
    if (Array.isArray(duties) && duties.length > 0) {
      const values = [];
      const params = [];
      duties.forEach((duty, index) => {
        const offset = index * 4;
        params.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4})`);
        values.push(trip.id, duty.company_product_id, duty.duty_type, duty.duty_assignee_ids ?? []);
      });
      const dutyResult = await client.query(
        `INSERT INTO trip_duty_assignments (trip_id, company_product_id, duty_type, duty_assignee_ids)
         VALUES ${params.join(", ")}
         RETURNING *`,
        values
      );
      insertedDuties = dutyResult.rows.map(mapDutyRow);

      const itemValues = [];
      const itemParams = [];
      duties.forEach((duty, index) => {
        const offset = index * 4;
        itemParams.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4})`);
        itemValues.push(trip.id, duty.company_product_id, duty.duty_type, duty.duty_assignee_ids ?? []);
      });
      const itemResult = await client.query(
        `INSERT INTO trip_items (trip_id, company_product_id, duty_type, duty_assignee_ids)
         VALUES ${itemParams.join(", ")}
         RETURNING *`,
        itemValues
      );
      insertedItems = itemResult.rows.map(mapTripItemRow);
    }

    await client.query("COMMIT");
    res.status(201).json({ trip, duties: insertedDuties, items: insertedItems });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Failed to create trip:", error);
    res.status(500).json({ error: "Failed to create trip" });
  } finally {
    client.release();
  }
});

router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "Valid id is required" });

  try {
    const {
      name,
      planned_at,
      status,
      assignee_ids,
      notes,
      planned_by,
      transport_mode,
      vehicle_plate,
      lodging_provider
    } = req.body || {};

    const result = await pool.query(
      `UPDATE trips
       SET name = COALESCE($1, name),
           planned_at = COALESCE($2, planned_at),
           status = COALESCE($3, status),
           assignee_ids = COALESCE($4, assignee_ids),
           notes = COALESCE($5, notes),
           planned_by = COALESCE($6, planned_by),
           transport_mode = COALESCE($7, transport_mode),
           vehicle_plate = COALESCE($8, vehicle_plate),
           lodging_provider = COALESCE($9, lodging_provider),
           updated_at = NOW()
       WHERE id = $10
       RETURNING *`,
      [name, planned_at, status, assignee_ids, notes, planned_by, transport_mode, vehicle_plate, lodging_provider, id]
    );

    if (result.rowCount === 0) return res.status(404).json({ error: "Trip not found" });

    res.json(mapTripRow(result.rows[0]));
  } catch (error) {
    console.error("Failed to update trip:", error);
    res.status(500).json({ error: "Failed to update trip" });
  }
});

router.put("/:id/duties", async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "Valid id is required" });

  const { duties = [] } = req.body || {};

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM trip_duty_assignments WHERE trip_id = $1", [id]);
    await client.query("DELETE FROM trip_items WHERE trip_id = $1", [id]);

    let inserted = [];
    let insertedItems = [];
    if (Array.isArray(duties) && duties.length > 0) {
      const values = [];
      const params = [];
      duties.forEach((duty, index) => {
        const offset = index * 4;
        params.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4})`);
        values.push(id, duty.company_product_id, duty.duty_type, duty.duty_assignee_ids ?? []);
      });
      const result = await client.query(
        `INSERT INTO trip_duty_assignments (trip_id, company_product_id, duty_type, duty_assignee_ids)
         VALUES ${params.join(", ")}
         RETURNING *`,
        values
      );
      inserted = result.rows.map(mapDutyRow);

      const itemValues = [];
      const itemParams = [];
      duties.forEach((duty, index) => {
        const offset = index * 4;
        itemParams.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4})`);
        itemValues.push(id, duty.company_product_id, duty.duty_type, duty.duty_assignee_ids ?? []);
      });
      const itemResult = await client.query(
        `INSERT INTO trip_items (trip_id, company_product_id, duty_type, duty_assignee_ids)
         VALUES ${itemParams.join(", ")}
         RETURNING *`,
        itemValues
      );
      insertedItems = itemResult.rows.map(mapTripItemRow);
    }

    await client.query("COMMIT");
    res.json({ duties: inserted, items: insertedItems });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Failed to update duties:", error);
    res.status(500).json({ error: "Failed to update duties" });
  } finally {
    client.release();
  }
});

router.get("/:id/completion", async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "Valid id is required" });

  try {
    if (req.user?.role === "lab" && req.user.labId) {
      const tripCheck = await pool.query(
        "SELECT 1 FROM trip_items WHERE trip_id = $1 AND lab_assigned_lab_id = $2 LIMIT 1",
        [id, req.user.labId]
      );
      if (tripCheck.rowCount === 0) return res.status(403).json({ error: "Forbidden" });
    }

    const headerResult = await pool.query(`SELECT * FROM trip_completions WHERE trip_id = $1`, [id]);
    if (headerResult.rowCount === 0) return res.json(null);

    const completion = mapCompletionRow(headerResult.rows[0]);
    const entriesResult = await pool.query(
      `SELECT * FROM trip_completion_entries WHERE trip_completion_id = $1 ORDER BY id`,
      [completion.id]
    );
    const entries = entriesResult.rows.map(mapCompletionEntryRow);

    res.json({ completion, entries });
  } catch (error) {
    console.error("Failed to fetch completion:", error);
    res.status(500).json({ error: "Failed to fetch completion" });
  }
});

router.put("/:id/completion", async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "Valid id is required" });

  const {
    completed_by_employee_ids = [],
    transport_mode,
    vehicle_plate = null,
    total_km = null,
    total_days = null,
    lodging_provider = null,
    entries = []
  } = req.body || {};

  const client = await pool.connect();
  try {
    if (req.user?.role === "lab" && req.user.labId) {
      const tripCheck = await client.query(
        "SELECT 1 FROM trip_items WHERE trip_id = $1 AND lab_assigned_lab_id = $2 LIMIT 1",
        [id, req.user.labId]
      );
      if (tripCheck.rowCount === 0) {
        client.release();
        return res.status(403).json({ error: "Forbidden" });
      }
    }

    await client.query("BEGIN");

    const upsertResult = await client.query(
      `INSERT INTO trip_completions (trip_id, completed_by_employee_ids, transport_mode, vehicle_plate, total_km, total_days, lodging_provider)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (trip_id) DO UPDATE
         SET completed_by_employee_ids = EXCLUDED.completed_by_employee_ids,
             transport_mode = EXCLUDED.transport_mode,
             vehicle_plate = EXCLUDED.vehicle_plate,
             total_km = EXCLUDED.total_km,
             total_days = EXCLUDED.total_days,
             lodging_provider = EXCLUDED.lodging_provider,
             created_at = trip_completions.created_at
       RETURNING *`,
      [id, completed_by_employee_ids, transport_mode, vehicle_plate, total_km, total_days, lodging_provider]
    );

    const completion = mapCompletionRow(upsertResult.rows[0]);

    await client.query("DELETE FROM trip_completion_entries WHERE trip_completion_id = $1", [completion.id]);

    let insertedEntries = [];
    if (Array.isArray(entries) && entries.length > 0) {
      const values = [];
      const params = [];
      entries.forEach((entry, index) => {
        const offset = index * 14;
        params.push(
          `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, $${offset + 13}, $${offset + 14})`
        );
        values.push(
          completion.id,
          entry.company_product_id,
          entry.duty_type,
          entry.duty_assignee_ids ?? [],
          entry.performed_at ?? null,
          entry.inspected_at ?? null,
          entry.sample_not_completed ?? null,
          entry.inspection_not_completed ?? null,
          entry.tracking_code ?? null,
          entry.lodging_payment_amount ?? null,
          entry.transport_expense ?? null,
          entry.meal_lunch_expense ?? null,
          entry.meal_dinner_expense ?? null,
          entry.company_expense ?? null
        );
      });

      const entryResult = await client.query(
        `INSERT INTO trip_completion_entries (
            trip_completion_id,
            company_product_id,
            duty_type,
            duty_assignee_ids,
            performed_at,
            inspected_at,
            sample_not_completed,
            inspection_not_completed,
            tracking_code,
            lodging_payment_amount,
            transport_expense,
            meal_lunch_expense,
            meal_dinner_expense,
            company_expense
         )
         VALUES ${params.join(", ")}
         RETURNING *`,
        values
      );
      insertedEntries = entryResult.rows.map(mapCompletionEntryRow);
    }

    // Update trip_items with completion info (sampled dates and tracking codes)
    for (const entry of entries) {
      const companyProductId = Number(entry.company_product_id);
      if (!Number.isFinite(companyProductId)) continue;
      const performedAt = entry.performed_at ?? null;
      const inspectedAt = entry.inspected_at ?? null;
      const trackingCode = entry.tracking_code ?? null;
      await client.query(
        `UPDATE trip_items
           SET sampled = CASE WHEN $2::timestamptz IS NULL THEN sampled ELSE TRUE END,
               sampled_at = COALESCE($2::timestamptz, sampled_at),
               lab_entry_code = COALESCE($3::text, lab_entry_code),
               updated_at = NOW()
         WHERE trip_id = $1 AND company_product_id = $4::bigint`,
        [id, performedAt, trackingCode, companyProductId]
      );

      // Persist latest sample/inspection dates to company_products
      await client.query(
        `UPDATE company_products
           SET last_sample_date = COALESCE($2::timestamptz, last_sample_date),
               last_inspection_date = COALESCE($3::timestamptz, last_inspection_date),
               updated_at = NOW()
         WHERE id = $1`,
        [companyProductId, performedAt, inspectedAt]
      );
    }

    await client.query("UPDATE trips SET status = 'COMPLETED', updated_at = NOW() WHERE id = $1", [id]);

    await client.query("COMMIT");
    res.json({ completion, entries: insertedEntries });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Failed to save completion:", error);
    res.status(500).json({ error: "Failed to save completion" });
  } finally {
    client.release();
  }
});

module.exports = router;
