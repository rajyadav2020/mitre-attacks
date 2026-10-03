const router = require("express").Router();
const { z } = require("zod");
const repo = require("./assets.repository");
const authenticate = require("../../middleware/auth");
const authorize = require("../../middleware/rbac");
const validate = require("../../middleware/validate");
const { E } = require("../../utils/errors");

const assetSchema = z.object({
  hostname: z.string().min(1).max(255),
  criticality: z.number().int().min(0).max(100).default(50),
  owner: z.string().optional(),
  environment: z.string().default("production"),
});

router.use(authenticate);

router.get("/", async (req, res) => {
  const take = Math.min(Number(req.query.limit) || 50, 200);
  const skip = Math.max(Number(req.query.offset) || 0, 0);
  res.json({ items: await repo.list(req.principal.tenantId, { skip, take }) });
});

router.get("/:id", async (req, res) => {
  const asset = await repo.get(req.principal.tenantId, req.params.id);
  if (!asset) throw E.notFound("Asset not found");   // 404, not 403: don't reveal it exists in another tenant
  res.json(asset);
});

router.post("/", authorize("ADMIN", "SOC_MANAGER"), validate(assetSchema), async (req, res) => {
  res.status(201).json(await repo.create(req.principal.tenantId, req.body));
});

module.exports = router;