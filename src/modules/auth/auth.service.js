const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const prisma = require("../../database/prisma");
const config = require("../../config/auth");
const imageService = require("../shared/image.service");
const profileFields = { id: true, email: true, imageUrl: true };
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
async function getProfile(id) {
  const user = await prisma.user.findUnique({ where: { id }, select: profileFields });
  if (!user) throw Object.assign(new Error("Usuário não encontrado"), { statusCode: 404 });
  return user;
}

async function uploadProfileImage(id, buffer) {
  const user = await getProfile(id);
  return imageService.replaceImage("profiles", buffer, user.imageUrl, (imageUrl) =>
    prisma.user.update({
      where: { id, imageUrl: user.imageUrl },
      data: { imageUrl },
      select: profileFields,
    }));
}

module.exports = { register, login, getProfile, uploadProfileImage };
