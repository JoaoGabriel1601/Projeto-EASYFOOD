const sharp = require("sharp");
const path = require("node:path");
const fs = require("node:fs/promises");
const { randomUUID } = require("node:crypto");

const uploadsDirectory = path.resolve(__dirname, "../../../uploads");
const dishDirectory = path.join(uploadsDirectory, "dishes");
const allowedFormats = new Set(["jpeg", "png", "webp"]);
const imagePrefix = "/uploads/dishes/";

async function optimizeImage(buffer) {
  let optimized;
  try {
    const image = sharp(buffer, { limitInputPixels: 25_000_000, failOn: "warning" });
    const { format } = await image.metadata();
    if (!allowedFormats.has(format)) throw new Error("Formato inválido");
    optimized = await image.rotate().resize({ width: 800, withoutEnlargement: true })
      .webp({ quality: 80 }).toBuffer();
  } catch {
    throw Object.assign(new Error("Imagem inválida. Envie JPEG, PNG ou WebP com até 25 megapixels."), { statusCode: 400 });
  }
  const filename = `${randomUUID()}.webp`;
  await fs.mkdir(dishDirectory, { recursive: true });
  const filepath = path.join(dishDirectory, filename);
  try {
    await fs.writeFile(filepath, optimized, { flag: "wx" });
  } catch (error) {
    if (error.code !== "EEXIST") await removeImage(imagePrefix + filename);
    throw error;
  }
  return imagePrefix + filename;
}

async function removeImage(imageUrl) {
  if (!imageUrl?.startsWith(imagePrefix)) return;
  const filename = imageUrl.slice(imagePrefix.length);
  if (!/^[0-9a-f-]{36}\.webp$/.test(filename)) return;
  try {
    await fs.rm(path.join(dishDirectory, filename), { force: true });
  } catch (error) {
    console.error("[IMAGEM] Falha ao remover arquivo:", error.code);
  }
}

module.exports = { optimizeImage, removeImage, uploadsDirectory };
