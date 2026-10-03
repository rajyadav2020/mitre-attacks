const { z } = require("zod");

const password = z.string().min(10).max(128);

exports.registerSchema = z.object({
  tenantName: z.string().min(2).max(100),
  fullName: z.string().min(2).max(100),
  email: z.string().email().toLowerCase(),
  password,
});
exports.loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1),
});
exports.refreshSchema = z.object({ refreshToken: z.string().min(20) });