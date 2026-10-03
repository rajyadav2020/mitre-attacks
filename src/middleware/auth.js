const { verifyAccessToken } = require("../utils/tokens");
const { E } = require("../utils/errors");

module.exports = function authenticate(req, _res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) throw E.unauthorized("Missing bearer token");
  try {
    const p = verifyAccessToken(header.slice(7));
    req.principal = { userId: p.sub, tenantId: p.tenantId, role: p.role };
    next();
  } catch {
    throw E.unauthorized("Invalid or expired token");
  }
};