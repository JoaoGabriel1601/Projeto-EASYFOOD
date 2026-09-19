const prisma = require("../../database/prisma");
async function listRestaurants() {
  return prisma.restaurant.findMany({ orderBy: { id: "asc" } });
}
async function createRestaurant({ name, category, rating }) {
  return prisma.restaurant.create({ data: { name, category, rating: rating ?? 0 } });
}
module.exports = { listRestaurants, createRestaurant };
