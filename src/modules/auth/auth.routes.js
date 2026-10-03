// auth.routes.js
const router = require("express").Router();
const rateLimit = require("express-rate-limit");
const validate = require("../../middleware/validate");
const c = require("./auth.controller");
const v = require("./auth.validation");

const env = require("../../config/env");
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 20,
  standardHeaders: true, legacyHeaders: false,
  skip: () => env.NODE_ENV === "test",
});

router.post("/register", authLimiter, validate(v.registerSchema), c.register);
router.post("/login",    authLimiter, validate(v.loginSchema),    c.login);
router.post("/refresh",  validate(v.refreshSchema), c.refresh);
router.post("/logout",   validate(v.refreshSchema), c.logout);

module.exports = router;