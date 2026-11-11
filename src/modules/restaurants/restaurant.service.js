const prisma = require("../../database/prisma");
const emailService = require("../shared/email.service");
async function listRestaurants() {
  return prisma.restaurant.findMany({ orderBy: { id: "asc" } });
}
async function createRestaurant({ name, category, rating }) {
  const restaurant = await prisma.restaurant.create({ data: { name, category, rating: rating ?? 0 } });
  const to = process.env.EMAIL_TEST_TO;
  if (!to) return restaurant;

  const messages = [
    {
      toName: restaurant.name,
      subject: `Bem-vindo à EasyFood, ${restaurant.name}!`,
      header: `Olá, ${restaurant.name}!`,
      body: `Seu restaurante foi cadastrado com sucesso na EasyFood.\nCategoria: ${restaurant.category}.`,
      footer: "Equipe EasyFood",
    },
    {
      toName: "Comercial EasyFood",
      subject: `Novo restaurante cadastrado: ${restaurant.name}`,
      header: "Novo restaurante na plataforma",
      body: `Nome: ${restaurant.name}\nCategoria: ${restaurant.category}\nAvaliação: ${restaurant.rating}`,
      footer: "Notificação automática - EasyFood",
    },
  ];
  const results = await Promise.allSettled(messages.map((message) => emailService.sendEmail({ to, ...message })));
  for (const result of results) {
    if (result.status === "rejected") console.error("[EMAIL] Falha no envio:", result.reason.message);
  }
  return restaurant;
}
module.exports = { listRestaurants, createRestaurant };
