const secret = process.env.JWT_SECRET;
if (!secret || Buffer.byteLength(secret) < 32) {
  throw new Error("Configure JWT_SECRET no .env com uma chave aleatória de pelo menos 32 bytes.");
}
module.exports = { secret, algorithm: "HS256", expiresIn: "1d" };
