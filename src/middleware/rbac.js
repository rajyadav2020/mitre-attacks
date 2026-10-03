const { E } = require("../utils/errors");

module.exports = (...roles) => (req, _res, next) => {
  if (!roles.includes(req.principal.role)) throw E.forbidden("Insufficient role");
  next();
};