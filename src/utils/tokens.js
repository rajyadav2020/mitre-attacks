const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const env = require("../config/env");

const signAccessToken = (user) =>
  jwt.sign({ tenantId: user.tenantId, role: user.role }, env.JWT_ACCESS_SECRET, {
    subject: user.id,
    expiresIn: env.JWT_ACCESS_TTL,
    algorithm: "HS256",
    issuer: "mitre-attacks",
  });

const verifyAccessToken = (token) =>
  jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: ["HS256"], issuer: "mitre-attacks" });

const generateRefreshToken = () => crypto.randomBytes(48).toString("base64url");
const hashToken = (t) => crypto.createHash("sha256").update(t).digest("hex");

module.exports = { signAccessToken, verifyAccessToken, generateRefreshToken, hashToken };