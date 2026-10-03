const prisma = require("../../config/db");

exports.list = (tenantId, { skip = 0, take = 50 } = {}) =>
  prisma.asset.findMany({ where: { tenantId }, skip, take, orderBy: { createdAt: "desc" } });

exports.get = (tenantId, id) =>
  prisma.asset.findFirst({ where: { id, tenantId } });   // findFirst, never findUnique({id})

exports.create = (tenantId, data) =>
  prisma.asset.create({ data: { ...data, tenantId } });