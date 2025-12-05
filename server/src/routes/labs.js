const router = require("express").Router();
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { pool } = require("../db/client");

const mapLabRow = (row) => ({
  id: row.id,
  name: row.name,
  city: row.city ?? undefined,
  email: row.email
});

const normalizeEmail = (email) => (email || "").trim().toLowerCase();

const generateOneTimePassword = () => crypto.randomBytes(9).toString("base64url").slice(0, 12);

router.get("/", async (req, res) => {
  try {
    const params = [];
    let where = "";
    if (req.user?.role === "lab" && req.user.labId) {
      where = "WHERE id = $1";
      params.push(req.user.labId);
    }
    const result = await pool.query(`SELECT id, name, city, email FROM labs ${where} ORDER BY name`, params);
    res.json(result.rows.map(mapLabRow));
  } catch (error) {
    console.error("Failed to fetch labs:", error);
    res.status(500).json({ error: "Failed to fetch labs" });
  }
});

router.post("/", async (req, res) => {
  const { name, city = null, email } = req.body || {};
  const normalizedEmail = normalizeEmail(email);

  if (!name) return res.status(400).json({ error: "name is required" });
  if (!normalizedEmail) return res.status(400).json({ error: "email is required" });

  const client = await pool.connect();
  const oneTimePassword = generateOneTimePassword();
  try {
    await client.query("BEGIN");
    const passwordHash = await bcrypt.hash(oneTimePassword, 10);
    await client.query(
      `INSERT INTO users (email, password, role)
       VALUES ($1, $2, 'lab')`,
      [normalizedEmail, passwordHash]
    );

    const result = await client.query(
      `INSERT INTO labs (name, city, email) VALUES ($1, $2, $3) RETURNING id, name, city, email`,
      [name.trim(), city, normalizedEmail]
    );
    await client.query("COMMIT");
    res.status(201).json({ ...mapLabRow(result.rows[0]), oneTimePassword });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Failed to create lab:", error);
    if (error.code === "23505") {
      return res.status(409).json({ error: "Email already exists" });
    }
    res.status(500).json({ error: "Failed to create lab" });
  } finally {
    client.release();
  }
});

router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "valid id is required" });
  const { name, city = null, email } = req.body || {};
  const normalizedEmail = normalizeEmail(email);
  if (!name) return res.status(400).json({ error: "name is required" });
  if (!normalizedEmail) return res.status(400).json({ error: "email is required" });

  const client = await pool.connect();
  let oneTimePassword;
  try {
    await client.query("BEGIN");
    const existing = await client.query("SELECT email FROM labs WHERE id = $1 FOR UPDATE", [id]);
    if (existing.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Lab not found" });
    }

    const currentEmail = normalizeEmail(existing.rows[0].email);

    if (currentEmail !== normalizedEmail) {
      // Ensure target email is free
      const conflictCheck = await client.query("SELECT email FROM users WHERE email = $1", [normalizedEmail]);
      if (conflictCheck.rowCount > 0) {
        await client.query("ROLLBACK");
        return res.status(409).json({ error: "Email already exists" });
      }
      const hasUser = await client.query("SELECT email FROM users WHERE email = $1", [currentEmail]);
      if (hasUser.rowCount > 0) {
        await client.query("UPDATE users SET email = $1 WHERE email = $2", [normalizedEmail, currentEmail]);
      } else {
        oneTimePassword = generateOneTimePassword();
        const passwordHash = await bcrypt.hash(oneTimePassword, 10);
        await client.query(
          `INSERT INTO users (email, password, role)
           VALUES ($1, $2, 'lab')`,
          [normalizedEmail, passwordHash]
        );
      }
    } else {
      const hasUser = await client.query("SELECT email FROM users WHERE email = $1", [normalizedEmail]);
      if (hasUser.rowCount === 0) {
        oneTimePassword = generateOneTimePassword();
        const passwordHash = await bcrypt.hash(oneTimePassword, 10);
        await client.query(
          `INSERT INTO users (email, password, role)
           VALUES ($1, $2, 'lab')`,
          [normalizedEmail, passwordHash]
        );
      }
    }

    const result = await client.query(
      `UPDATE labs SET name = $1, city = $2, email = $3, updated_at = NOW() WHERE id = $4 RETURNING id, name, city, email`,
      [name.trim(), city, normalizedEmail, id]
    );
    await client.query("COMMIT");
    res.json({ ...mapLabRow(result.rows[0]), ...(oneTimePassword ? { oneTimePassword } : {}) });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Failed to update lab:", error);
    if (error.code === "23505") {
      return res.status(409).json({ error: "Email already exists" });
    }
    res.status(500).json({ error: "Failed to update lab" });
  } finally {
    client.release();
  }
});

router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "valid id is required" });
  try {
    const result = await pool.query("DELETE FROM labs WHERE id = $1 RETURNING email", [id]);
    if (result.rowCount > 0) {
      const email = normalizeEmail(result.rows[0].email);
      if (email) {
        await pool.query("DELETE FROM users WHERE email = $1", [email]);
      }
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to delete lab:", error);
    res.status(500).json({ error: "Failed to delete lab" });
  }
});

module.exports = router;
