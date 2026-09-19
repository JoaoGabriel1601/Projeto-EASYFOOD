require("dotenv").config({ quiet: true });
const app = require("./src/app");
const prisma = require("./src/database/prisma");
const port = Number(process.env.PORT || 3000);
async function start() {
  await prisma.$connect();
  const server = app.listen(port, () => {
    console.log(`EasyFood rodando na porta ${server.address().port}`);
  });
  server.on("error", async (error) => {
    console.error(`Não foi possível iniciar o servidor: ${error.code}`);
    await prisma.$disconnect();
    process.exitCode = 1;
  });
  const shutdown = () => server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}
start().catch(async (error) => {
  console.error(`Não foi possível conectar ao PostgreSQL (${error.code || error.name}). Confira DATABASE_URL.`);
  await prisma.$disconnect();
  process.exitCode = 1;
});
