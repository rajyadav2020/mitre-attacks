module.exports = (schema) => (req, _res, next) => {
  req.body = schema.parse(req.body); // ZodError is handled in the error middleware
  next();
};