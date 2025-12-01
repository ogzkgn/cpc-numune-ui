const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const productsRoute = require("./routes/products");
const companyProductsRoute = require("./routes/companyProducts");
const employeesRoute = require("./routes/employees");
const tripsRoute = require("./routes/trips");
const labShipmentsRoute = require("./routes/labShipments");
const labFormsRoute = require("./routes/labForms");
const labItemsRoute = require("./routes/labItems");
const labsRoute = require("./routes/labs");

const app = express();
const port = process.env.PORT || 4000;

app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") ?? ["http://localhost:5173"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true
  })
);
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/products", productsRoute);
app.use("/company-products", companyProductsRoute);
app.use("/employees", employeesRoute);
app.use("/trips", tripsRoute);
app.use("/lab-shipments", labShipmentsRoute);
app.use("/lab-forms", labFormsRoute);
app.use("/lab-items", labItemsRoute);
app.use("/labs", labsRoute);

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
