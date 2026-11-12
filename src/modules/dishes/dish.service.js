const prisma = require("../../database/prisma");
const imageService = require("../shared/image.service");

function ensureOwnership(ownerId, userId) {
  if (ownerId !== null && ownerId !== userId) {
    throw Object.assign(new Error("Você não tem permissão para gerenciar este restaurante"), { statusCode: 403 });
  }
}

async function createDish(restaurantId, data, userId) {
  const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId }, select: { ownerId: true } });
  if (!restaurant) throw Object.assign(new Error("Restaurante não encontrado"), { statusCode: 404 });
  ensureOwnership(restaurant.ownerId, userId);
  try {
    return await prisma.dish.create({ data: { ...data, restaurantId } });
  } catch (error) {
    if (error.code === "P2003") {
      throw Object.assign(new Error("Restaurante não encontrado"), { statusCode: 404 });
    }
    throw error;
  }
}

async function listDishes(restaurantId) {
  return prisma.dish.findMany({ where: { restaurantId }, orderBy: { id: "asc" } });
}

async function uploadDishImage(dishId, buffer, userId) {
  const dish = await prisma.dish.findUnique({
    where: { id: dishId },
    include: { restaurant: { select: { ownerId: true } } },
  });
  if (!dish) throw Object.assign(new Error("Prato não encontrado"), { statusCode: 404 });
  ensureOwnership(dish.restaurant.ownerId, userId);
  return imageService.replaceImage("dishes", buffer, dish.imageUrl, (imageUrl) =>
    prisma.dish.update({ where: { id: dishId, imageUrl: dish.imageUrl }, data: { imageUrl } }));
}

module.exports = { createDish, listDishes, uploadDishImage };
