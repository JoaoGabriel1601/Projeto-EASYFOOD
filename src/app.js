const express = require("express");
const cors = require("cors");
const path = require("path");
const restaurantRoutes = require("./modules/restaurants/restaurant.routes");
const authRoutes = require("./modules/auth/auth.routes");
const app = express();
app.disable("x-powered-by");
app.use(cors());
app.use(express.json({ limit: "100kb" }));
app.use(express.static(path.join(__dirname, "../public")));
app.use("/auth", authRoutes);
app.use("/restaurants", restaurantRoutes);
app.use((req, res) => res.status(404).json({ error: "Rota não encontrada" }));
app.use((error, req, res, next) => {
  if (error.type === "entity.parse.failed") return res.status(400).json({ error: "JSON inválido" });
  if (error.type === "entity.too.large") return res.status(413).json({ error: "Corpo da requisição muito grande" });
  res.status(500).json({ error: "Erro interno do servidor" });
});
module.exports = app;
