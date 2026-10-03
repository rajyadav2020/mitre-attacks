const bcrypt = require("bcrypt");
const prisma = require("../../config/db");
const env = require("../../config/env");
const { E } = require("../../utils/errors");
const { signAccessToken, generateRefreshToken, hashToken } = require("../../utils/tokens");
const audit = require("../audit/audit.service");

const BCRYPT_COST = 12;
// Used so a login for an unknown email takes about as long as a real one
const DUMMY_HASH = bcrypt.hashSync("dummy-password", BCRYPT_COST);

async function issueTokens(user, client = prisma) {
  const refreshToken = generateRefreshToken();
  await client.refreshToken.create({
    data: {
      userId: user.id,
      tenantId: user.tenantId,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + env.REFRESH_TTL_DAYS * 86400_000),
    },
  });
  return { accessToken: signAccessToken(user), refreshToken, tokenType: "Bearer" };
}

const publicUser = (u) => ({
  id: u.id, tenantId: u.tenantId, email: u.email, fullName: u.fullName, role: u.role,
});

exports.register = async ({ tenantName, fullName, email, password }, ctx) => {
  if (await prisma.user.findUnique({ where: { email } })) throw E.conflict("Email already registered");

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);

  return prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({ data: { name: tenantName } });
    const user = await tx.user.create({
      data: { tenantId: tenant.id, email, passwordHash, fullName, role: "ADMIN" },
    });
    await audit.record(
      { tenantId: tenant.id, actorId: user.id, operation: "TENANT_REGISTERED",
        objectType: "Tenant", objectId: tenant.id, requestId: ctx.requestId },
      tx
    );
    return { user: publicUser(user), ...(await issueTokens(user, tx)) };
  });
};

exports.login = async ({ email, password }, ctx) => {
  const user = await prisma.user.findUnique({ where: { email } });
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);

  if (!user || !ok || user.status !== "ACTIVE") {
    if (user) {
      await audit.record({ tenantId: user.tenantId, actorId: user.id, operation: "LOGIN_FAILED", requestId: ctx.requestId });
    }
    throw E.unauthorized("Invalid credentials"); // same message for every failure
  }

  await audit.record({ tenantId: user.tenantId, actorId: user.id, operation: "LOGIN_SUCCEEDED", requestId: ctx.requestId });
  return { user: publicUser(user), ...(await issueTokens(user)) };
};

exports.refresh = async ({ refreshToken }) => {
  const tokenHash = hashToken(refreshToken);
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash }, include: { user: true } });
  if (!stored) throw E.unauthorized("Invalid refresh token");

  // Reuse of a rotated token means it may have been stolen, so revoke the whole family
  if (stored.revokedAt) {
    await prisma.refreshToken.updateMany({ where: { userId: stored.userId, revokedAt: null }, data: { revokedAt: new Date() } });
    throw E.unauthorized("Refresh token reuse detected");
  }
  if (stored.expiresAt < new Date() || stored.user.status !== "ACTIVE") throw E.unauthorized("Refresh token expired");

  return prisma.$transaction(async (tx) => {
    await tx.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
    return issueTokens(stored.user, tx);
  });
};

exports.logout = async ({ refreshToken }) => {
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashToken(refreshToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
};