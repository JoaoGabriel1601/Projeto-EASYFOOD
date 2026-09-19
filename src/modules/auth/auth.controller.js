const service = require("./auth.service");
function credentialsValid(email, password) {
  return typeof email === "string" && email.trim().length <= 150 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
    typeof password === "string" && password.trim().length > 0 && Buffer.byteLength(password, "utf8") <= 72;
}
async function register(req, res, next) {
  const { name, email, password } = req.body || {};
  if (typeof name !== "string" || !name.trim() || name.trim().length > 150 || !credentialsValid(email, password)) {
    return res.status(400).json({ error: "Informe nome (até 150 caracteres), e-mail válido e senha de até 72 bytes" });
  }
  try {
    const user = await service.register({ name: name.trim(), email: email.trim().toLowerCase(), password });
    res.status(201).json(user);
  } catch (error) {
    if (error.code === "P2002") return res.status(409).json({ error: "E-mail já cadastrado" });
    next(error);
  }
}
async function login(req, res, next) {
  const { email, password } = req.body || {};
  if (!credentialsValid(email, password)) return res.status(400).json({ error: "Informe e-mail válido e senha de até 72 bytes" });
  try {
    const result = await service.login({ email: email.trim().toLowerCase(), password });
    if (!result) return res.status(401).json({ error: "Credenciais inválidas" });
    res.json(result);
  } catch (error) { next(error); }
}
function me(req, res) {
  res.json({ message: "Você está autenticado!", user: req.user });
}
module.exports = { register, login, me };
