class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
const E = {
  badRequest: (m = "Bad request", d) => new AppError(400, "BAD_REQUEST", m, d),
  unauthorized: (m = "Unauthorized") => new AppError(401, "UNAUTHORIZED", m),
  forbidden: (m = "Forbidden") => new AppError(403, "FORBIDDEN", m),
  notFound: (m = "Not found") => new AppError(404, "NOT_FOUND", m),
  conflict: (m = "Conflict") => new AppError(409, "CONFLICT", m),
};
module.exports = { AppError, E };