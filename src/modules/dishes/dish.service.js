const prisma = require("../../database/prisma");
const imageService = require("../shared/image.service");

async function createDish(restaurantId, data) {
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

async function uploadDishImage(dishId, buffer) {
  const dish = await prisma.dish.findUnique({ where: { id: dishId } });
  if (!dish) throw Object.assign(new Error("Prato não encontrado"), { statusCode: 404 });

  const imageUrl = await imageService.optimizeImage(buffer);
  let updated;
  try {
    updated = await prisma.dish.update({
      where: { id: dishId, imageUrl: dish.imageUrl },
      data: { imageUrl },
    });
  } catch (error) {
    await imageService.removeImage(imageUrl);
    if (error.code === "P2025") {
      throw Object.assign(new Error("O prato foi alterado durante o upload. Tente novamente."), { statusCode: 409 });
    }
    throw error;
  }
  await imageService.removeImage(dish.imageUrl);
  return updated;
}

module.exports = { createDish, listDishes, uploadDishImage };
