const prisma = require("../../config/db");

exports.record = (data, client = prisma) =>
  client.auditLog.create({ data });