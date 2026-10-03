const { ZodError } = require("zod");
const { AppError } = require("../utils/errors");
const logger = require("../utils/logger");

exports.notFound = (_req, res) =>
  res.status(404).json({ error: { code: "NOT_FOUND", message: "Route not found" } });

exports.errorHandler = (err, req, res, _next) => {
  let status = 500, code = "INTERNAL_ERROR", message = "Internal server error", details;

  if (err instanceof ZodError) {
    status = 400; code = "VALIDATION_ERROR"; message = "Invalid request";
    details = err.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
  } else if (err instanceof AppError) {
    ({ status, code, message, details } = err);
  } else if (err.code === "P2002") {
    status = 409; code = "CONFLICT"; message = "Resource already exists";
  } else {
    (req.log || logger).error({ err }, "unhandled error");
  }

  res.status(status).json({ error: { code, message, details, requestId: req.id } });
};