const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const schemaPath = path.join(__dirname, "schema.sql");
const sql = fs.readFileSync(schemaPath, "utf8");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const run = async () => {
  try {
    console.log("Connecting to database...");
    await pool.query(sql);
    console.log("Schema applied successfully.");
  } catch (error) {
    console.error("Failed to apply schema:", error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
};

run();
