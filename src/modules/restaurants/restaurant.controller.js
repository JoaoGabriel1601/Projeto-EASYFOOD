const service = require("./restaurant.service");
async function list(req, res, next) {
  try { res.json(await service.listRestaurants()); } catch (error) { next(error); }
}
async function create(req, res, next) {
  const { name, category, rating } = req.body || {};
  if (typeof name !== "string" || !name.trim() || typeof category !== "string" || !category.trim()) {
    return res.status(400).json({ error: "Nome e categoria são obrigatórios" });
  }
  if (name.trim().length > 150 || category.trim().length > 100) {
    return res.status(400).json({ error: "Nome deve ter até 150 caracteres e categoria até 100" });
  }
  if (rating != null && (typeof rating !== "number" || !Number.isFinite(rating) || rating < 0 || rating > 5)) {
    return res.status(400).json({ error: "Avaliação deve ser um número entre 0 e 5" });
  }
  try {
    const restaurant = await service.createRestaurant({ name: name.trim(), category: category.trim(), rating });
    res.status(201).json(restaurant);
  } catch (error) { next(error); }
}
module.exports = { list, create };
