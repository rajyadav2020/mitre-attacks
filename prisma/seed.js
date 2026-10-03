const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const prisma = new PrismaClient();

(async () => {
  const tenant = await prisma.tenant.upsert({
    where: { id: "tenant_demo" }, update: {}, create: { id: "tenant_demo", name: "Demo Corp" },
  });
  const passwordHash = await bcrypt.hash("Passw0rd!Passw0rd", 12);
  const users = [
    ["admin@demo.io", "ADMIN"], ["t1@demo.io", "TIER_1_ANALYST"],
    ["t2@demo.io", "TIER_2_ANALYST"], ["manager@demo.io", "SOC_MANAGER"],
  ];
  for (const [email, role] of users) {
    await prisma.user.upsert({
      where: { email }, update: {},
      create: { email, role, fullName: email.split("@")[0], passwordHash, tenantId: tenant.id },
    });
  }
  const assets = [["WS-17", 90, "finance"], ["DC-01", 100, "it"], ["WS-22", 40, "hr"]];
  for (const [hostname, criticality, owner] of assets) {
    await prisma.asset.upsert({
      where: { tenantId_hostname: { tenantId: tenant.id, hostname } },
      update: {}, create: { tenantId: tenant.id, hostname, criticality, owner },
    });
  }
  console.log("seeded");
})().finally(() => prisma.$disconnect());