require("dotenv").config({ quiet: true });
const prisma = require("../src/database/prisma");
async function main() {
  // Reexecutar o seed não duplica os exemplos nem apaga dados existentes.
  for (const data of [
    { name: "Pizzaria Napoli", category: "Pizza", rating: 4.5 },
    { name: "Burger House", category: "Burger", rating: 4.2 },
    { name: "Sushi Express", category: "Japonesa", rating: 4.8 }
  ]) {
    const existing = await prisma.restaurant.findFirst({ where: { name: data.name, category: data.category } });
    if (!existing) await prisma.restaurant.create({ data });
  }
  console.log("Dados iniciais disponíveis!");
}
main().catch((error) => {
  console.error(`Falha no seed: ${error.code || error.name}`);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
