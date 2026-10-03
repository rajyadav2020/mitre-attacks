const pino = require("pino");
const env = require("../config/env");

module.exports = pino({
  level: env.LOG_LEVEL,
  redact: ["req.headers.authorization", "req.headers.cookie", "*.password", "*.passwordHash", "*.refreshToken"],
  transport: env.NODE_ENV === "development" ? { target: "pino-pretty" } : undefined,
});