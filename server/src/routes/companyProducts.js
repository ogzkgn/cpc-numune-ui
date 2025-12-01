const router = require("express").Router();
const { pool } = require("../db/client");

router.get("/", async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        id,
        company_name,
        product_name,
        product_type,
        product_id,
        bt_code,
        code,
        product_code,
        location,
        certificate_date,
        last_sample_date,
        last_inspection_date,
        payment_status,
        requires_sampling,
        sampling_interval_months,
        lab_return_days,
        standard_no,
        status
       FROM company_products
       ORDER BY created_at DESC, id DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Failed to fetch company products:", error);
    res.status(500).json({ error: "Failed to fetch company products" });
  }
});

router.post("/", async (req, res) => {
  try {
    const {
      company_name,
      product_name,
      product_type,
      product_id,
      bt_code = null,
      code = null,
      product_code = null,
      location = null,
      certificate_date = null,
      last_sample_date = null,
      last_inspection_date = null,
      payment_status = null,
      requires_sampling = false,
      sampling_interval_months = null,
      lab_return_days = null,
      standard_no = null,
      status = "devam"
    } = req.body || {};

    if (!company_name || !product_name || !product_type) {
      return res.status(400).json({ error: "company_name, product_name and product_type are required" });
    }

    const result = await pool.query(
      `INSERT INTO company_products (
        company_name, product_name, product_type, product_id, bt_code, code, product_code, location,
        certificate_date, last_sample_date, last_inspection_date, payment_status,
        requires_sampling, sampling_interval_months, lab_return_days, standard_no, status
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12,
        $13, $14, $15, $16, $17
      )
      RETURNING *`,
      [
        company_name,
        product_name,
        product_type,
        product_id ?? null,
        bt_code,
        code,
        product_code,
        location,
        certificate_date,
        last_sample_date,
        last_inspection_date,
        payment_status,
        requires_sampling,
        sampling_interval_months,
        lab_return_days,
        standard_no,
        status
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Failed to create company product:", error);
    res.status(500).json({ error: "Failed to create company product" });
  }
});

router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!id) {
    return res.status(400).json({ error: "Valid id is required" });
  }

  try {
    const {
      company_name,
      product_name,
      product_type,
      product_id,
      bt_code = null,
      code = null,
      product_code = null,
      location = null,
      certificate_date = null,
      last_sample_date = null,
      last_inspection_date = null,
      payment_status = null,
      requires_sampling = false,
      sampling_interval_months = null,
      lab_return_days = null,
      standard_no = null,
      status = "devam"
    } = req.body || {};

    if (!company_name || !product_name || !product_type) {
      return res.status(400).json({ error: "company_name, product_name and product_type are required" });
    }

    const result = await pool.query(
      `UPDATE company_products
       SET company_name = $1,
           product_name = $2,
           product_type = $3,
           product_id = $4,
           bt_code = $5,
           code = $6,
           product_code = $7,
           location = $8,
           certificate_date = $9,
           last_sample_date = $10,
           last_inspection_date = $11,
           payment_status = $12,
           requires_sampling = $13,
           sampling_interval_months = $14,
           lab_return_days = $15,
           standard_no = $16,
           status = $17,
           updated_at = NOW()
       WHERE id = $18
       RETURNING *`,
      [
        company_name,
        product_name,
        product_type,
        product_id ?? null,
        bt_code,
        code,
        product_code,
        location,
        certificate_date,
        last_sample_date,
        last_inspection_date,
        payment_status,
        requires_sampling,
        sampling_interval_months,
        lab_return_days,
        standard_no,
        status,
        id
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Company product not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Failed to update company product:", error);
    res.status(500).json({ error: "Failed to update company product" });
  }
});

router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!id) {
    return res.status(400).json({ error: "Valid id is required" });
  }

  try {
    await pool.query("DELETE FROM company_products WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to delete company product:", error);
    res.status(500).json({ error: "Failed to delete company product" });
  }
});

module.exports = router;
