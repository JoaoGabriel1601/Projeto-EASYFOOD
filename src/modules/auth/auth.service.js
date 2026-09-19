const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const prisma = require("../../database/prisma");
const config = require("../../config/auth");
async function register({ name, email, password }) {
  const hash = await bcrypt.hash(password, 10);
  return prisma.user.create({ data: { name, email, password: hash }, select: { id: true, name: true, email: true } });
}
async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.password))) return null;
  const token = jwt.sign({ sub: String(user.id), email: user.email }, config.secret, {
    algorithm: config.algorithm, expiresIn: config.expiresIn
  });
  return { token, user: { id: user.id, name: user.name, email: user.email } };
}
module.exports = { register, login };
