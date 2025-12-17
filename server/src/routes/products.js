const router = require("express").Router();
const { pool } = require("../db/client");

router.get("/", async (req, res) => {
  try {
    if (req.user?.role === "lab" && req.user.labId) {
      // For lab users, return only products tied to their assigned trip items
      const result = await pool.query(
        `SELECT DISTINCT p.id, p.name, p.product_type, p.requires_sampling, p.sampling_interval_months, p.lab_return_days, p.standard_no
         FROM products p
         JOIN company_products cp ON cp.product_id = p.id
         JOIN trip_items ti ON ti.company_product_id = cp.id
         WHERE ti.lab_assigned_lab_id = $1
         ORDER BY p.name`,
        [req.user.labId]
      );
      return res.json(result.rows);
    }

    const result = await pool.query(
      `SELECT id, name, product_type, requires_sampling, sampling_interval_months, lab_return_days, standard_no
       FROM products
       ORDER BY name`
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Failed to fetch products:", error);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

router.post("/", async (req, res) => {
  try {
    const {
      name,
      product_type,
      requires_sampling = false,
      sampling_interval_months = null,
      lab_return_days = null,
      standard_no = null
    } = req.body || {};

    if (!name || !product_type) {
      return res.status(400).json({ error: "name and product_type are required" });
    }

    const result = await pool.query(
      `INSERT INTO products (name, product_type, requires_sampling, sampling_interval_months, lab_return_days, standard_no)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, product_type, requires_sampling, sampling_interval_months, lab_return_days, standard_no`,
      [name, product_type, requires_sampling, sampling_interval_months, lab_return_days, standard_no]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Failed to create product:", error);
    res.status(500).json({ error: "Failed to create product" });
  }
});

router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!id) {
    return res.status(400).json({ error: "Valid product id is required" });
  }

  try {
    await pool.query("DELETE FROM products WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to delete product:", error);
    res.status(500).json({ error: "Failed to delete product" });
  }
});

module.exports = router;
