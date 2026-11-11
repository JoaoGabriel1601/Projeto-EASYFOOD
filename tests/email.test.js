require("dotenv").config({ quiet: true });
const { test } = require("node:test");
const assert = require("node:assert/strict");
const prisma = require("../src/database/prisma");
const { createRestaurant } = require("../src/modules/restaurants/restaurant.service");

test("envia duas mensagens após persistir e preserva o restaurante quando o provedor falha", async (t) => {
  const env = { EMAIL_API_KEY: "test", EMAIL_FROM: "from@example.test", EMAIL_TEST_TO: "to@example.test" };
  for (const [key, value] of Object.entries(env)) {
    const previous = process.env[key];
    process.env[key] = value;
    t.after(() => {
      if (previous === undefined) delete process.env[key];
      else process.env[key] = previous;
    });
  }
  const restaurant = { id: 1, name: "Cantina <Teste>", category: "Italiana", rating: 4.7 };
  const create = t.mock.fn(async () => restaurant);
  const originalCreate = prisma.restaurant.create;
  prisma.restaurant.create = create;
  t.after(() => { prisma.restaurant.create = originalCreate; });
  const requests = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    requests.push({ url, payload: JSON.parse(options.body), saved: create.mock.callCount() });
    return new Response(null, { status: requests.length === 1 ? 503 : 202 });
  });
  const logError = t.mock.method(console, "error", () => {});
  t.mock.method(console, "info", () => {});

  assert.equal(await createRestaurant(restaurant), restaurant);
  assert.equal(requests.length, 2);
  assert.equal(logError.mock.callCount(), 1);
  assert.ok(requests.every(({ url, payload, saved }) =>
    saved === 1 && url === "https://api.mailersend.com/v1/email" &&
    payload.to[0].email === env.EMAIL_TEST_TO && payload.html.includes("&lt;Teste&gt;")));
  assert.notEqual(requests[0].payload.subject, requests[1].payload.subject);
});
