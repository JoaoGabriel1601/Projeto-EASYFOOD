const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { randomBytes } = require("node:crypto");
const jwt = require("jsonwebtoken");
// Chave efêmera apenas neste processo de teste; não lê nem substitui o .env.
process.env.JWT_SECRET = randomBytes(48).toString("hex");
const app = require("../src/app");
let server, base;
before(async () => {
  server = await new Promise(resolve => {
    const listener = app.listen(0, "127.0.0.1", () => resolve(listener));
  });
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => new Promise(resolve => server.close(resolve)));

test("middleware aceita JWT válido e retorna apenas identidade", async () => {
  const token = jwt.sign({ sub: "42", email: "aluno@example.com" }, process.env.JWT_SECRET, { expiresIn: "1d" });
  const res = await fetch(base + "/auth/me", { headers: { Authorization: `Bearer ${token}` } });
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { message: "Você está autenticado!", user: { id: 42, email: "aluno@example.com" } });
});
test("middleware bloqueia tokens ausentes, adulterados, expirados e payloads inválidos", async () => {
  const payload = { sub: "42", email: "aluno@example.com" };
  const headers = [undefined, "Basic x", "Bearer x", "Bearer x y",
    `Bearer ${jwt.sign(payload, "outra-chave", { expiresIn: "1d" })}`,
    `Bearer ${jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: -1 })}`,
    `Bearer ${jwt.sign(payload, process.env.JWT_SECRET, { algorithm: "HS384", expiresIn: "1d" })}`,
    `Bearer ${jwt.sign(payload, process.env.JWT_SECRET)}`,
    `Bearer ${jwt.sign({ sub: "abc", email: payload.email }, process.env.JWT_SECRET, { expiresIn: "1d" })}`];
  for (const authorization of headers) {
    for (const [method, route] of [["GET", "/auth/me"], ["POST", "/restaurants"]]) {
      const res = await fetch(base + route, { method, headers: authorization ? { Authorization: authorization } : {} });
      assert.equal(res.status, 401);
      assert.equal(typeof (await res.json()).error, "string");
    }
  }
});
test("controllers rejeitam entradas inválidas antes de consultar o banco", async () => {
  for (const route of ["/auth/register", "/auth/login"]) {
    for (const body of [undefined, {}, { name: [], email: "invalido", password: 42 }, { name: "Aluno", email: "a@b.com", password: "é".repeat(37) }]) {
      const res = await fetch(base + route, { method: "POST", headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
      assert.equal(res.status, 400);
    }
  }
  const token = jwt.sign({ sub: "42", email: "a@b.com" }, process.env.JWT_SECRET, { expiresIn: "1d" });
  for (const body of [{}, { name: " ", category: "Teste" }, { name: "A", category: "B", rating: 6 }, { name: "A", category: "B", rating: "4.3" }]) {
    const res = await fetch(base + "/restaurants", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
    assert.equal(res.status, 400);
  }
});
test("JSON malformado e rota desconhecida têm respostas JSON apropriadas", async () => {
  const bad = await fetch(base + "/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" });
  assert.equal(bad.status, 400); assert.equal((await bad.json()).error, "JSON inválido");
  const missing = await fetch(base + "/inexistente");
  assert.equal(missing.status, 404); assert.equal((await missing.json()).error, "Rota não encontrada");
});
