const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const { port, clientOrigin } = require("./config");
const { migrate } = require("./db");
const authRoutes = require("./routes/auth");
const crmRoutes = require("./routes/crm");

migrate();

const app = express();

app.use(helmet());
app.use(cors({ origin: clientOrigin === "*" ? true : clientOrigin, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "Vixelry CRM API" });
});

app.use("/api/auth", authRoutes);
app.use("/api/crm", crmRoutes);

app.use((req, res) => {
  res.status(404).json({ error: "Route not found." });
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ error: "Internal server error." });
});

app.listen(port, () => {
  console.log(`Vixelry CRM API running on http://localhost:${port}`);
});
