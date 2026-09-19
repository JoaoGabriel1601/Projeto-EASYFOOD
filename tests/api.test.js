require("dotenv").config({ quiet: true });
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { once } = require("node:events");
const { randomUUID } = require("node:crypto");
const path = require("node:path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../src/database/prisma");
const email = `teste-${randomUUID()}@example.com`;
const password = "123456";
let child, base, token, user, restaurant;
const createdRestaurants = [];

async function startServer() {
  child = spawn(process.execPath, ["server.js"], {
    cwd: path.join(__dirname, ".."), env: { ...process.env, PORT: "0" },
    stdio: ["ignore", "pipe", "pipe"]
  });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { child.kill(); reject(new Error("API não iniciou em 20s")); }, 20000);
    let output = "";
    child.stdout.on("data", chunk => {
      output += chunk.toString();
      const match = /rodando na porta (\d+)/.exec(output);
      if (match) { base = `http://127.0.0.1:${match[1]}`; clearTimeout(timer); resolve(); }
    });
    child.once("error", error => { clearTimeout(timer); reject(error); });
    child.once("exit", code => { clearTimeout(timer); reject(new Error(`API encerrou: ${code}`)); });
  });
}
async function stopServer() {
  if (child && child.exitCode === null) {
    const exited = once(child, "exit");
    child.kill();
    await exited;
  }
}
async function request(method, route, body, authorization) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (authorization) headers.Authorization = authorization;
  const response = await fetch(base + route, {
    method, headers, body: body === undefined ? undefined : JSON.stringify(body)
  });
  return { status: response.status, body: await response.json() };
}
before(async () => { await prisma.$connect(); await startServer(); });
after(async () => {
  await stopServer();
  if (createdRestaurants.length) await prisma.restaurant.deleteMany({ where: { id: { in: createdRestaurants } } });
  await prisma.user.deleteMany({ where: { email } });
  await prisma.$disconnect();
});

test("GET /restaurants continua público", async () => {
  const r = await request("GET", "/restaurants");
  assert.equal(r.status, 200); assert.ok(Array.isArray(r.body));
});
test("cadastro válido retorna 201 sem senha e armazena hash bcrypt", async () => {
  const r = await request("POST", "/auth/register", { name: "Aluno de teste", email, password });
  assert.equal(r.status, 201); user = r.body;
  assert.deepEqual(Object.keys(user).sort(), ["email", "id", "name"]);
  const stored = await prisma.user.findUnique({ where: { email } });
  assert.notEqual(stored.password, password);
  assert.ok(await bcrypt.compare(password, stored.password));
});
test("e-mail repetido normalizado retorna 409", async () => {
  const r = await request("POST", "/auth/register", { name: "Aluno", email: email.toUpperCase(), password });
  assert.equal(r.status, 409);
});
test("campos ausentes, tipos errados e senhas acima de 72 bytes retornam 400", async () => {
  for (const body of [undefined, {}, { name: [], email, password }, { name: "Aluno", email: "invalido", password }, { name: "Aluno", email, password: "é".repeat(37) }]) {
    assert.equal((await request("POST", "/auth/register", body)).status, 400);
  }
  assert.equal((await request("POST", "/auth/login")).status, 400);
});
test("senha incorreta e usuário inexistente retornam 401", async () => {
  for (const credentials of [{ email, password: "errada" }, { email: `outro-${email}`, password }]) {
    const r = await request("POST", "/auth/login", credentials);
    assert.equal(r.status, 401); assert.equal(r.body.error, "Credenciais inválidas");
  }
});
test("login retorna JWT com validade de um dia e usuário sem senha", async () => {
  const r = await request("POST", "/auth/login", { email: email.toUpperCase(), password });
  assert.equal(r.status, 200); token = r.body.token;
  assert.deepEqual(r.body.user, user);
  const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
  assert.equal(payload.sub, String(user.id)); assert.equal(payload.exp - payload.iat, 86400);
});
test("rotas protegidas rejeitam ausência, assinatura errada, expiração e cabeçalhos malformados", async () => {
  const payload = { sub: String(user.id), email };
  const invalid = [undefined, "Basic abc", "Bearer ", "Bearer invalido", `Bearer ${token} extra`,
    `Bearer ${jwt.sign(payload, "outra-chave", { expiresIn: "1d" })}`,
    `Bearer ${jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: -1 })}`,
    `Bearer ${jwt.sign(payload, process.env.JWT_SECRET, { algorithm: "HS384", expiresIn: "1d" })}`,
    `Bearer ${jwt.sign(payload, process.env.JWT_SECRET)}`];
  for (const authorization of invalid) {
    assert.equal((await request("GET", "/auth/me", undefined, authorization)).status, 401);
    assert.equal((await request("POST", "/restaurants", { name: "Invasor", category: "Teste" }, authorization)).status, 401);
  }
});
test("GET /auth/me identifica o usuário com token válido", async () => {
  const r = await request("GET", "/auth/me", undefined, `Bearer ${token}`);
  assert.equal(r.status, 200); assert.deepEqual(r.body.user, { id: user.id, email });
});
test("POST /restaurants autenticado valida campos e rating", async () => {
  for (const body of [undefined, {}, { name: " ", category: "Teste" }, { name: "A", category: "Teste", rating: 6 }, { name: "A", category: "Teste", rating: "4.3" }]) {
    assert.equal((await request("POST", "/restaurants", body, `Bearer ${token}`)).status, 400);
  }
});
test("POST autenticado retorna 201 e o restaurante aparece no GET", async () => {
  const r = await request("POST", "/restaurants", { name: `Teste ${randomUUID()}`, category: "Mexicana", rating: 4.3 }, `Bearer ${token}`);
  assert.equal(r.status, 201); restaurant = r.body; createdRestaurants.push(restaurant.id);
  assert.equal(Number(restaurant.rating), 4.3);
  const list = await request("GET", "/restaurants");
  assert.ok(list.body.some(item => item.id === restaurant.id));
});
test("rating omitido assume zero", async () => {
  const r = await request("POST", "/restaurants", { name: `Teste ${randomUUID()}`, category: "Teste" }, `Bearer ${token}`);
  assert.equal(r.status, 201); createdRestaurants.push(r.body.id); assert.equal(Number(r.body.rating), 0);
});
test("JSON malformado recebe erro JSON com status 400", async () => {
  const r = await fetch(base + "/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" });
  assert.equal(r.status, 400); assert.equal((await r.json()).error, "JSON inválido");
});
test("reiniciar o processo preserva restaurante, usuário e validade do token", async () => {
  await stopServer(); await startServer();
  const r = await request("GET", "/restaurants");
  assert.ok(r.body.some(item => item.id === restaurant.id));
  assert.equal((await request("POST", "/auth/login", { email, password })).status, 200);
  assert.equal((await request("GET", "/auth/me", undefined, `Bearer ${token}`)).status, 200);
});
