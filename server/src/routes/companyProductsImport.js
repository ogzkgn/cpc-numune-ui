const router = require("express").Router();
const multer = require("multer");
const xlsx = require("xlsx");
const { pool } = require("../db/client");

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }); // 5 MB

const headerLabels = {
  company_name: "Firma Adı",
  product_name: "Ürün Adı",
  product_type: "Ürün Tipi",
  product_id: "Ürün Kodu",
  bt_code: "BT Kodu",
  code: "Kod",
  product_code: "Ürün Kodu",
  location: "İl/İlçe",
  certificate_date: "Belge Tarihi",
  last_sample_date: "Son Numune Tarihi",
  last_inspection_date: "Son Denetim Tarihi",
  payment_status: "Ödeme Durumu",
  requires_sampling: "Numune?",
  sampling_interval_months: "Numune Döngü (Ay)",
  lab_return_days: "Lab Dönüş (Gün)",
  standard_no: "Standart No",
  status: "Durum"
};

const requiredHeaders = ["company_name", "product_name", "product_type", "product_id"];
const optionalHeaders = Object.keys(headerLabels).filter((key) => !requiredHeaders.includes(key));
const allHeaders = [...requiredHeaders, ...optionalHeaders];
const displayHeaders = allHeaders.map((key) => headerLabels[key] ?? key);

const normalizeCell = (value) => {
  if (value === undefined || value === null) return null;
  if (typeof value === "string") return value.trim();
  return value;
};

router.get("/template", (_req, res) => {
  const rows = [displayHeaders];
  const worksheet = xlsx.utils.aoa_to_sheet(rows);
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, "template");
  const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });
  res.setHeader("Content-Disposition", 'attachment; filename="company_products_template.xlsx"');
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.send(buffer);
});

router.post("/import", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "file is required" });
  }

  try {
    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: false });
    if (!rows.length) {
      return res.status(400).json({ error: "File is empty" });
    }
    const headerRow = rows[0];
    const inverseHeaderMap = Object.entries(headerLabels).reduce((acc, [key, label]) => {
      acc[label] = key;
      acc[key] = key;
      return acc;
    }, {});
    const canonicalHeaders = headerRow.map((header) => inverseHeaderMap[header] ?? header);
    const missing = requiredHeaders.filter((h) => !canonicalHeaders.includes(h));
    if (missing.length) {
      return res.status(400).json({ error: `Missing required columns: ${missing.join(", ")}` });
    }
    const json = rows.slice(1).map((row) => {
      const obj = {};
      canonicalHeaders.forEach((key, idx) => {
        if (allHeaders.includes(key)) {
          obj[key] = row[idx] ?? null;
        }
      });
      return obj;
    });

    const client = await pool.connect();
    const errors = [];
    let inserted = 0;

    try {
      await client.query("BEGIN");
      for (let i = 0; i < json.length; i += 1) {
        const row = json[i];
        const line = i + 2; // header row is 1

        const payload = {};
        allHeaders.forEach((key) => {
          payload[key] = normalizeCell(row[key]);
        });

        if (!payload.company_name || !payload.product_name || !payload.product_type) {
          errors.push({ line, error: "company_name, product_name, product_type required" });
          continue;
        }

        try {
          await client.query(
            `INSERT INTO company_products (
              company_name, product_name, product_type, product_id, bt_code, code, product_code, location,
              certificate_date, last_sample_date, last_inspection_date, payment_status,
              requires_sampling, sampling_interval_months, lab_return_days, standard_no, status
            ) VALUES (
              $1,$2,$3,$4,$5,$6,$7,$8,
              $9,$10,$11,$12,
              COALESCE($13,false),$14,$15,$16,COALESCE($17,'devam')
            )`,
            [
              payload.company_name,
              payload.product_name,
              payload.product_type,
              payload.product_id ? Number(payload.product_id) : null,
              payload.bt_code,
              payload.code,
              payload.product_code,
              payload.location,
              payload.certificate_date,
              payload.last_sample_date,
              payload.last_inspection_date,
              payload.payment_status,
              payload.requires_sampling === true ||
              (typeof payload.requires_sampling === "string" &&
                ["true", "evet", "1", "yes"].includes(payload.requires_sampling.toLowerCase())),
              payload.sampling_interval_months ? Number(payload.sampling_interval_months) : null,
              payload.lab_return_days ? Number(payload.lab_return_days) : null,
              payload.standard_no,
              payload.status ?? "devam"
            ]
          );
          inserted += 1;
        } catch (err) {
          errors.push({ line, error: err.message });
        }
      }
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("Import failed:", err);
      return res.status(500).json({ error: "Import failed" });
    } finally {
      client.release();
    }

    res.json({ inserted, errors, total: json.length });
  } catch (error) {
    console.error("Failed to import company products:", error);
    res.status(500).json({ error: "Failed to import company products" });
  }
});

module.exports = router;
