const router = require("express").Router();
const { pool } = require("../db/client");

router.get("/", async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, city, status, skills
       FROM employees
       ORDER BY name ASC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Failed to fetch employees:", error);
    res.status(500).json({ error: "Failed to fetch employees" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, city = null, status = "available", skills = [] } = req.body || {};

    if (!name) {
      return res.status(400).json({ error: "name is required" });
    }

    const result = await pool.query(
      `INSERT INTO employees (name, city, status, skills)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, city, status, skills`,
      [name, city, status, skills]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Failed to create employee:", error);
    res.status(500).json({ error: "Failed to create employee" });
  }
});

router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!id) {
    return res.status(400).json({ error: "Valid id is required" });
  }

  try {
    const { name, city = null, status = "available", skills = [] } = req.body || {};

    if (!name) {
      return res.status(400).json({ error: "name is required" });
    }

    const result = await pool.query(
      `UPDATE employees
       SET name = $1,
           city = $2,
           status = $3,
           skills = $4,
           updated_at = NOW()
       WHERE id = $5
       RETURNING id, name, city, status, skills`,
      [name, city, status, skills, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Employee not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Failed to update employee:", error);
    res.status(500).json({ error: "Failed to update employee" });
  }
});

router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!id) {
    return res.status(400).json({ error: "Valid id is required" });
  }

  try {
    await pool.query("DELETE FROM employees WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to delete employee:", error);
    res.status(500).json({ error: "Failed to delete employee" });
  }
});

module.exports = router;
