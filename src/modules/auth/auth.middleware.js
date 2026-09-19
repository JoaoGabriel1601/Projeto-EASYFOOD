const jwt = require("jsonwebtoken");
const config = require("../../config/auth");
function authenticate(req, res, next) {
  const match = /^Bearer ([^\s]+)$/i.exec(req.headers.authorization || "");
  if (!match) return res.status(401).json({ error: "Token não fornecido" });
  try {
    const payload = jwt.verify(match[1], config.secret, { algorithms: [config.algorithm] });
    const id = Number(payload.sub);
    if (!Number.isSafeInteger(id) || id <= 0 || typeof payload.email !== "string" || !Number.isFinite(payload.exp)) {
      throw new Error("Payload inválido");
    }
    req.user = { id, email: payload.email };
  } catch {
    return res.status(401).json({ error: "Token inválido ou expirado" });
  }
  next();
}
module.exports = authenticate;
