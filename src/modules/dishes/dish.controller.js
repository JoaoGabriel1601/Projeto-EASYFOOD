const dishService = require("./dish.service");

function parseId(value) {
  if (!/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return id <= 2147483647 ? id : null;
}

async function create(req, res, next) {
  const restaurantId = parseId(req.params.restaurantId);
  if (!restaurantId) return res.status(400).json({ error: "Identificador de restaurante inválido" });

  const { name, description, price } = req.body || {};
  if (typeof name !== "string" || !name.trim() || typeof description !== "string" || !description.trim()) {
    return res.status(400).json({ error: "Nome e descrição são obrigatórios" });
  }
  if (!["number", "string"].includes(typeof price) || !/^\d{1,8}(?:\.\d{1,2})?$/.test(String(price))) {
    return res.status(400).json({ error: "Preço inválido. Use até oito dígitos inteiros e duas casas decimais." });
  }
  try {
    const dish = await dishService.createDish(restaurantId, { name: name.trim(), description: description.trim(), price }, req.user.id);
    return res.status(201).json(dish);
  } catch (error) {
    return next(error);
  }
}

async function list(req, res, next) {
  const restaurantId = parseId(req.params.restaurantId);
  if (!restaurantId) return res.status(400).json({ error: "Identificador de restaurante inválido" });
  try {
    return res.json(await dishService.listDishes(restaurantId));
  } catch (error) {
    return next(error);
  }
}

async function uploadImage(req, res, next) {
  const dishId = parseId(req.params.dishId);
  if (!dishId) return res.status(400).json({ error: "Identificador de prato inválido" });
  if (!req.file) return res.status(400).json({ error: "Nenhuma imagem enviada" });
  try {
    return res.json(await dishService.uploadDishImage(dishId, req.file.buffer, req.user.id));
  } catch (error) {
    return next(error);
  }
}

module.exports = { create, list, uploadImage };
