const multer = require("multer");

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const parseImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 0 },
  fileFilter(req, file, callback) {
    if (!allowedTypes.has(file.mimetype)) return callback(new Error("Formato de imagem não permitido"));
    callback(null, true);
  },
}).single("image");

module.exports = function uploadImage(req, res, next) {
  parseImage(req, res, (error) => {
    if (!error) return next();
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ error: "A imagem deve ter até 5 MB" });
    }
    return res.status(400).json({ error: "Envie uma imagem JPEG, PNG ou WebP no campo image" });
  });
};
