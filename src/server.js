const app = require("./app");
const env = require("./config/env");
const prisma = require("./config/db");
const logger = require("./utils/logger");

const server = app.listen(env.PORT, () => logger.info(`API listening on :${env.PORT}`));

const shutdown = (signal) => {
  logger.info(`${signal} received, shutting down`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
};
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));