const router = require("express").Router();
const bcrypt = require("bcrypt");
const { z } = require("zod");
const prisma = require("../../config/db");
const authenticate = require("../../middleware/auth");
const authorize = require("../../middleware/rbac");
const validate = require("../../middleware/validate");
const audit = require("../audit/audit.service");
const { E } = require("../../utils/errors");

const createUserSchema = z.object({
  email: z.string().email().toLowerCase(),
  fullName: z.string().min(2),
  password: z.string().min(10).max(128),
  role: z.enum(["TIER_1_ANALYST", "TIER_2_ANALYST", "SOC_MANAGER", "ADMIN", "AI_SERVICE"]),
}); // note: no tenantId field, by design

router.use(authenticate);

router.get("/me", async (req, res) => {
  const user = await prisma.user.findFirst({
    where: { id: req.principal.userId, tenantId: req.principal.tenantId },
    select: { id: true, tenantId: true, email: true, fullName: true, role: true },
  });
  if (!user) throw E.unauthorized();
  res.json(user);
});

router.post("/", authorize("ADMIN"), validate(createUserSchema), async (req, res) => {
  const { tenantId, userId } = req.principal;
  const passwordHash = await bcrypt.hash(req.body.password, 12);
  const { password, ...rest } = req.body;

  const user = await prisma.$transaction(async (tx) => {
    const u = await tx.user.create({ data: { ...rest, passwordHash, tenantId } });
    await audit.record({ tenantId, actorId: userId, operation: "USER_CREATED", objectType: "User", objectId: u.id, requestId: req.id }, tx);
    return u;
  });
  res.status(201).json({ id: user.id, email: user.email, role: user.role, tenantId });
});

module.exports = router;