const router = require("express").Router();
const { pool } = require("../db/client");

const mapLabRow = (row) => ({
  id: row.id,
  name: row.name,
  city: row.city ?? undefined
});

router.get("/", async (_req, res) => {
  try {
    const result = await pool.query(`SELECT id, name, city FROM labs ORDER BY name`);
    res.json(result.rows.map(mapLabRow));
  } catch (error) {
    console.error("Failed to fetch labs:", error);
    res.status(500).json({ error: "Failed to fetch labs" });
  }
});

router.post("/", async (req, res) => {
  const { name, city = null } = req.body || {};
  if (!name) return res.status(400).json({ error: "name is required" });
  try {
    const result = await pool.query(
      `INSERT INTO labs (name, city) VALUES ($1, $2) RETURNING id, name, city`,
      [name, city]
    );
    res.status(201).json(mapLabRow(result.rows[0]));
  } catch (error) {
    console.error("Failed to create lab:", error);
    res.status(500).json({ error: "Failed to create lab" });
  }
});

router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "valid id is required" });
  const { name, city = null } = req.body || {};
  if (!name) return res.status(400).json({ error: "name is required" });
  try {
    const result = await pool.query(
      `UPDATE labs SET name = $1, city = $2, updated_at = NOW() WHERE id = $3 RETURNING id, name, city`,
      [name, city, id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "Lab not found" });
    res.json(mapLabRow(result.rows[0]));
  } catch (error) {
    console.error("Failed to update lab:", error);
    res.status(500).json({ error: "Failed to update lab" });
  }
});

router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "valid id is required" });
  try {
    await pool.query("DELETE FROM labs WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to delete lab:", error);
    res.status(500).json({ error: "Failed to delete lab" });
  }
});

module.exports = router;
