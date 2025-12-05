const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
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
const authRoute = require("./routes/auth");
const { authenticateJWT, requireRole } = require("./middleware/auth");

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
app.use(cookieParser());
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/auth", authRoute);
app.use("/products", authenticateJWT, requireRole(["admin"]), productsRoute);
app.use(
  "/company-products",
  authenticateJWT,
  (req, res, next) => {
    if (req.method === "GET") return next();
    return requireRole(["admin"])(req, res, next);
  },
  companyProductsRoute
);
app.use("/employees", authenticateJWT, requireRole(["admin"]), employeesRoute);
app.use("/trips", authenticateJWT, requireRole(["admin"]), tripsRoute);
app.use("/lab-shipments", authenticateJWT, requireRole(["admin", "lab"]), labShipmentsRoute);
app.use("/lab-forms", authenticateJWT, requireRole(["admin", "lab"]), labFormsRoute);
app.use("/lab-items", authenticateJWT, requireRole(["admin", "lab"]), labItemsRoute);
app.use(
  "/labs",
  authenticateJWT,
  (req, res, next) => {
    if (req.method === "GET") return next();
    return requireRole(["admin"])(req, res, next);
  },
  labsRoute
);

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
