const sharp = require("sharp");
const path = require("node:path");
const fs = require("node:fs/promises");
const { randomUUID } = require("node:crypto");

const uploadsDirectory = path.resolve(__dirname, "../../../uploads");
const allowedFormats = new Set(["jpeg", "png", "webp"]);

async function optimizeImage(buffer, folder) {
  if (!["dishes", "profiles"].includes(folder)) throw new Error("Pasta de imagem inválida");
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
  const imageUrl = `/uploads/${folder}/${filename}`;
  const directory = path.join(uploadsDirectory, folder);
  await fs.mkdir(directory, { recursive: true });
  const filepath = path.join(directory, filename);
  try {
    await fs.writeFile(filepath, optimized, { flag: "wx" });
  } catch (error) {
    if (error.code !== "EEXIST") await removeImage(imageUrl);
    throw error;
  }
  return imageUrl;
}

async function removeImage(imageUrl) {
  const match = /^\/uploads\/(dishes|profiles)\/([0-9a-f-]{36}\.webp)$/.exec(imageUrl);
  if (!match) return;
  try {
    await fs.rm(path.join(uploadsDirectory, match[1], match[2]), { force: true });
  } catch (error) {
    console.error("[IMAGEM] Falha ao remover arquivo:", error.code);
  }
}

async function replaceImage(folder, buffer, previousUrl, save) {
  const imageUrl = await optimizeImage(buffer, folder);
  let updated;
  try {
    updated = await save(imageUrl);
  } catch (error) {
    await removeImage(imageUrl);
    if (error.code === "P2025") {
      throw Object.assign(new Error("O registro foi alterado durante o upload. Tente novamente."), { statusCode: 409 });
    }
    throw error;
  }
  await removeImage(previousUrl);
  return updated;
}

module.exports = { replaceImage, removeImage, uploadsDirectory };
