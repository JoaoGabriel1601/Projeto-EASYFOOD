require("dotenv").config({ quiet: true });
const { once } = require("node:events");
const { randomUUID } = require("node:crypto");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const sharp = require("sharp");
const app = require("../src/app");
const prisma = require("../src/database/prisma");
const auth = require("../src/config/auth");
const { removeImage } = require("../src/modules/shared/image.service");

test("cardápio, upload e falha de e-mail pela API com PostgreSQL", async (t) => {
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${server.address().port}`;
  const token = jwt.sign({ sub: "1", email: "test@example.test" }, auth.secret, {
    algorithm: auth.algorithm,
    expiresIn: auth.expiresIn,
  });
  const headers = { Authorization: `Bearer ${token}` };
  const name = `Teste cardápio ${randomUUID()}`;
  const email = `${randomUUID()}@example.test`;
  let user;
  let restaurant;
  const images = [];
  t.after(async () => {
    server.close();
    try {
      if (restaurant) {
        await prisma.dish.deleteMany({ where: { restaurantId: restaurant.id } });
        await prisma.restaurant.delete({ where: { id: restaurant.id } });
      }
      for (const image of images) await removeImage(image);
      if (user) await prisma.user.delete({ where: { id: user.id } });
    } finally {
      await prisma.$disconnect();
    }
  });

  const emailSettings = { EMAIL_TEST_TO: "test@example.test", EMAIL_FROM: "from@example.test", EMAIL_API_KEY: "test" };
  for (const [key, value] of Object.entries(emailSettings)) {
    const original = process.env[key];
    process.env[key] = value;
    t.after(() => {
      if (original === undefined) delete process.env[key];
      else process.env[key] = original;
    });
  }
  const realFetch = globalThis.fetch;
  const emails = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    if (url === "https://api.mailersend.com/v1/email") {
      emails.push(JSON.parse(options.body));
      return new Response(null, { status: 503 });
    }
    return realFetch(url, options);
  });
  const postJson = (path, data, authorization = headers) => fetch(base + path, {
    method: "POST",
    headers: { ...authorization, "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const credentials = { email, password: "teste123" };
  const registration = await postJson("/auth/register", { ...credentials, name: "Teste" }, {});
  assert.equal(registration.status, 201);
  user = await registration.json();
  const login = await postJson("/auth/login", credentials, {});
  assert.equal(login.status, 200);
  const stranger = { ...headers };
  headers.Authorization = `Bearer ${(await login.json()).token}`;
  const created = await postJson("/restaurants", { name, category: "Italiana" });
  assert.equal(created.status, 201);
  restaurant = await created.json();
  assert.equal(restaurant.ownerId, user.id);
  assert.equal(emails.length, 2);
  const catalog = await (await fetch(base + "/restaurants")).json();
  assert.ok(catalog.some(({ id }) => id === restaurant.id));

  const menu = `/restaurants/${restaurant.id}/dishes`;
  const input = { name: "Pizza Margherita", description: "Tomate, queijo e manjericão", price: "49.90" };
  assert.equal((await postJson(menu, input, {})).status, 401);
  assert.equal((await postJson(menu, input, stranger)).status, 403);
  assert.equal((await postJson(menu, { ...input, price: "49.999" })).status, 400);
  assert.equal((await postJson("/restaurants/2147483647/dishes", input)).status, 404);
  const createdDish = await postJson(menu, input);
  assert.equal(createdDish.status, 201);
  const dish = await createdDish.json();
  assert.equal(dish.restaurantId, restaurant.id);
  assert.equal(dish.price, "49.9");
  assert.equal(dish.imageUrl, null);

  const imageRoute = base + `/dishes/${dish.id}/image`;
  const upload = (file, authorization = headers, url = imageRoute) => {
    const body = new FormData();
    if (file) body.set("image", file, "original.png");
    return fetch(url, { method: "POST", headers: authorization, body });
  };
  const source = await sharp({
    create: { width: 1600, height: 1000, channels: 3, background: "#c64a2b" },
  }).png({ compressionLevel: 0 }).toBuffer();
  const png = new Blob([source], { type: "image/png" });
  assert.equal((await upload(png, stranger)).status, 403);
  assert.equal((await upload(png, headers, base + "/dishes/2147483647/image")).status, 404);
  const profileRoute = base + "/auth/me/image";
  assert.equal((await upload(png, {}, profileRoute)).status, 401);
  assert.equal((await upload(new Blob(["texto"], { type: "image/png" }), headers, profileRoute)).status, 400);
  const profileUpload = await upload(png, headers, profileRoute + "?userId=2147483647");
  assert.equal(profileUpload.status, 200);
  const profile = await profileUpload.json();
  images.push(profile.imageUrl);
  assert.equal(profile.id, user.id);
  assert.match(profile.imageUrl, /^\/uploads\/profiles\/.*\.webp$/);
  assert.deepEqual((await (await fetch(base + "/auth/me", { headers })).json()).user, profile);
  const profileImage = await fetch(base + profile.imageUrl);
  assert.equal(profileImage.status, 200);
  assert.equal(profileImage.headers.get("content-type"), "image/webp");
  const profileMetadata = await sharp(Buffer.from(await profileImage.arrayBuffer())).metadata();
  assert.equal(profileMetadata.width, 800);
  assert.equal((await upload(png, {})).status, 401);
  assert.equal((await upload()).status, 400);
  assert.equal((await upload(new Blob(["texto"], { type: "text/plain" }))).status, 400);
  assert.equal((await upload(new Blob(["texto"], { type: "image/png" }))).status, 400);
  assert.equal((await upload(new Blob([source, Buffer.alloc(5 * 1024 * 1024 - source.length + 1)], { type: "image/png" }))).status, 413);
  assert.deepEqual(await (await fetch(base + menu)).json(), [dish]);

  const uploaded = await upload(png);
  assert.equal(uploaded.status, 200);
  const { imageUrl } = await uploaded.json();
  images.push(imageUrl);
  assert.match(imageUrl, /^\/uploads\/dishes\/.*\.webp$/);
  const image = await fetch(base + imageUrl);
  assert.equal(image.status, 200);
  assert.equal(image.headers.get("content-type"), "image/webp");
  const optimized = Buffer.from(await image.arrayBuffer());
  const { format, width, height } = await sharp(optimized).metadata();
  assert.deepEqual({ format, width, height }, { format: "webp", width: 800, height: 500 });
  assert.ok(optimized.length < source.length);
  t.diagnostic(`PNG 1600×1000, ${source.length} bytes → WebP 800×500, ${optimized.length} bytes`);

  const replacement = await upload(png);
  assert.equal(replacement.status, 200);
  const current = await replacement.json();
  images.push(current.imageUrl);
  assert.notEqual(current.imageUrl, imageUrl);
  assert.equal((await fetch(base + imageUrl)).status, 404);
  assert.deepEqual(await (await fetch(base + menu)).json(), [current]);
});
