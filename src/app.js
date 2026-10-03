const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const pinoHttp = require("pino-http");
const { randomUUID } = require("crypto");
const env = require("./config/env");
const prisma = require("./config/db");
const logger = require("./utils/logger");
const routes = require("./routes");
const { notFound, errorHandler } = require("./middleware/error");

const app = express();
app.disable("x-powered-by");

app.use(pinoHttp({
  logger,
  genReqId: (req, res) => {
    const id = req.headers["x-request-id"] || randomUUID();
    res.setHeader("x-request-id", id);
    return id;
  },
  autoLogging: { ignore: (req) => req.url === "/health" },
}));
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN.split(","), credentials: true }));
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => res.json({ status: "ok" }));              // liveness
app.get("/ready", async (_req, res) => {                                    // readiness
  try { await prisma.$queryRaw`SELECT 1`; res.json({ status: "ready" }); }
  catch { res.status(503).json({ status: "db_unavailable" }); }
});

app.use("/api/v1", routes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;