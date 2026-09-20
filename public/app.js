"use strict";

const $ = (id) => document.getElementById(id);
const PAGE_SIZE = 3;
const state = { restaurants: [], category: "Todos", page: 1, view: "home", token: null, user: null, register: false, loaded: false };
const emoji = { Pizza: "🍕", Burger: "🍔", Sushi: "🍣", Japonesa: "🍱", Saudável: "🥗", Mexicana: "🌮", Brasileira: "🍛", Italiana: "🍝" };
let favorites = new Set();
try {
  const saved = JSON.parse(localStorage.getItem("easyfood.favorites") || "[]");
  if (Array.isArray(saved)) favorites = new Set(saved.filter(Number.isSafeInteger));
} catch { /* Favoritos continuam disponíveis em memória se o armazenamento estiver indisponível. */ }

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function message(id, text = "", type = "error") {
  $(id).textContent = text;
  $(id).className = text ? `form-message ${type}` : "form-message";
}

async function api(path, { body, protectedRoute = false } = {}) {
  const headers = {};
  if (body) headers["Content-Type"] = "application/json";
  if (protectedRoute && state.token) headers.Authorization = `Bearer ${state.token}`;
  let response;
  try {
    response = await fetch(path, { method: body ? "POST" : "GET", headers, body: body ? JSON.stringify(body) : undefined });
  } catch { throw new Error("Não foi possível conectar. Tente novamente."); }
  const data = await response.json().catch(() => null);
  if (protectedRoute && response.status === 401) {
    state.token = null;
    state.user = null;
    updateAccount();
    throw new Error("Sua sessão expirou. Entre novamente para continuar.");
  }
  if (!response.ok) throw new Error(data?.error || "Não foi possível concluir a solicitação.");
  if (data === null) throw new Error("Resposta inesperada. Tente novamente.");
  return data;
}

function renderCategories() {
  const categories = ["Todos", ...new Set(state.restaurants.map(r => r.category).filter(Boolean))];
  if (!categories.includes(state.category)) state.category = "Todos";
  $("categories").replaceChildren(...categories.map(category => {
    const button = element("button", `category-chip${state.category === category ? " active" : ""}`, `${emoji[category] || "🍽️"} ${category}`);
    button.type = "button";
    button.setAttribute("aria-pressed", String(state.category === category));
    button.addEventListener("click", () => { state.category = category; state.page = 1; renderCategories(); renderRestaurants(); });
    return button;
  }));
}

function renderRestaurants() {
  if (!state.loaded) return;
  const query = $("search").value.trim().toLocaleLowerCase("pt-BR");
  const results = state.restaurants.filter(r =>
    (state.category === "Todos" || r.category === state.category) &&
    (state.view !== "favorites" || favorites.has(r.id)) &&
    `${r.name} ${r.category || ""}`.toLocaleLowerCase("pt-BR").includes(query)
  );
  results.sort((a, b) => $("sort").value === "rating" ? Number(b.rating) - Number(a.rating) :
    $("sort").value === "recent" ? b.id - a.id : a.name.localeCompare(b.name, "pt-BR"));
  const list = $("restaurant-list");
  list.replaceChildren();
  $("list-title").textContent = state.view === "favorites" ? "Seus favoritos" : "Restaurantes";
  if (!results.length) {
    list.append(element("p", "empty", state.view === "favorites" ? "Nenhum favorito encontrado. Marque o coração de um restaurante para salvá-lo." : "Nenhum restaurante encontrado para essa busca."));
    return;
  }
  for (const restaurant of results.slice(0, state.page * PAGE_SIZE)) {
    const card = element("article", "restaurant-card");
    const picture = element("div", "restaurant-img");
    picture.setAttribute("aria-hidden", "true");
    picture.append(element("span", "placeholder", emoji[restaurant.category] || "🏪"));
    const info = element("div", "restaurant-info");
    // Dados vindos da API são texto, nunca HTML executável.
    info.append(element("h3", "", restaurant.name), element("p", "meta", restaurant.category || "Sem categoria"),
      element("span", "rating", restaurant.rating == null ? "Sem avaliação" : `★ ${Number(restaurant.rating).toFixed(1)}`));
    const favorite = element("button", "heart", favorites.has(restaurant.id) ? "♥" : "♡");
    favorite.type = "button";
    favorite.setAttribute("aria-label", `${favorites.has(restaurant.id) ? "Remover" : "Adicionar"} ${restaurant.name} ${favorites.has(restaurant.id) ? "dos" : "aos"} favoritos`);
    favorite.setAttribute("aria-pressed", String(favorites.has(restaurant.id)));
    favorite.addEventListener("click", () => {
      if (favorites.has(restaurant.id)) favorites.delete(restaurant.id); else favorites.add(restaurant.id);
      try { localStorage.setItem("easyfood.favorites", JSON.stringify([...favorites])); } catch { /* Usa memória. */ }
      renderRestaurants();
    });
    card.append(picture, info, favorite);
    list.append(card);
  }
  if (results.length > state.page * PAGE_SIZE) {
    const remaining = results.length - state.page * PAGE_SIZE;
    const more = element("button", "load-more-btn", `Carregar mais (${remaining} restante${remaining === 1 ? "" : "s"})`);
    more.type = "button";
    more.addEventListener("click", () => { state.page++; renderRestaurants(); });
    list.append(more);
  }
}

async function loadRestaurants() {
  state.loaded = false;
  $("restaurant-list").replaceChildren(element("p", "loading", "Carregando restaurantes..."));
  try {
    const restaurants = await api("/restaurants");
    if (!Array.isArray(restaurants)) throw new Error("Não foi possível carregar os restaurantes.");
    state.restaurants = restaurants;
    state.loaded = true;
    renderCategories();
    renderRestaurants();
  } catch (error) {
    const retry = element("button", "load-more-btn", "Tentar novamente");
    retry.type = "button";
    retry.addEventListener("click", loadRestaurants);
    $("restaurant-list").replaceChildren(element("p", "error", error.message), retry);
  }
}

function switchView(view) {
  state.view = view;
  state.page = 1;
  const catalog = ["home", "search", "favorites"].includes(view);
  document.querySelectorAll("[data-catalog]").forEach(node => { node.hidden = !catalog; });
  $("add-panel").hidden = view !== "add";
  $("profile-panel").hidden = view !== "profile";
  document.querySelectorAll(".nav-item").forEach(button => {
    const active = button.dataset.view === view;
    button.classList.toggle("active", active);
    if (active) button.setAttribute("aria-current", "page"); else button.removeAttribute("aria-current");
  });
  if (catalog) renderRestaurants();
  if (view === "search") $("search").focus();
  if (view === "add") $("add-title").focus();
  if (view === "profile") $("profile-title").focus();
}

function updateAccount() {
  const signedIn = Boolean(state.user && state.token);
  $("signed-in").hidden = !signedIn;
  $("signed-out").hidden = signedIn;
  $("restaurant-form").hidden = !signedIn;
  $("add-login").hidden = signedIn;
  $("account-button").textContent = signedIn ? state.user.name : "Entrar";
  $("profile-name").textContent = signedIn ? `Olá, ${state.user.name}!` : "";
  $("profile-email").textContent = signedIn ? state.user.email : "";
  $("add-hint").textContent = signedIn ? "Preencha os dados do restaurante." : "Entre na sua conta para cadastrar um restaurante.";
}

function setAuthMode(register) {
  state.register = register;
  $("name-group").hidden = !register;
  $("auth-name").required = register;
  $("auth-password").autocomplete = register ? "new-password" : "current-password";
  $("auth-submit").textContent = register ? "Criar conta" : "Entrar";
  $("auth-toggle").textContent = register ? "Já tenho uma conta" : "Criar uma conta";
  $("auth-intro").textContent = register ? "Crie sua conta para cadastrar restaurantes." : "Entre para cadastrar restaurantes na EasyFood.";
  message("auth-message");
}

$("auth-form").addEventListener("submit", async event => {
  event.preventDefault();
  const password = $("auth-password").value;
  if (new TextEncoder().encode(password).length > 72 || !password.trim()) {
    message("auth-message", "Informe uma senha de até 72 bytes, sem deixar o campo em branco.");
    return;
  }
  const register = state.register;
  const body = { email: $("auth-email").value.trim(), password };
  if (register) body.name = $("auth-name").value.trim();
  $("auth-submit").disabled = true;
  $("auth-toggle").disabled = true;
  message("auth-message");
  try {
    const result = await api(register ? "/auth/register" : "/auth/login", { body });
    $("auth-password").value = "";
    if (register) {
      setAuthMode(false);
      message("auth-message", "Conta criada! Entre com seu e-mail e senha.", "success");
    } else {
      state.token = result.token;
      state.user = result.user;
      updateAccount();
      message("auth-message", "Login realizado com sucesso!", "success");
    }
  } catch (error) { message("auth-message", error.message); }
  finally { $("auth-submit").disabled = false; $("auth-toggle").disabled = false; }
});

$("restaurant-form").addEventListener("submit", async event => {
  event.preventDefault();
  const button = event.submitter || $("restaurant-form").querySelector("button");
  button.disabled = true;
  message("restaurant-message");
  try {
    const restaurant = await api("/restaurants", { protectedRoute: true, body: {
      name: $("restaurant-name").value.trim(), category: $("restaurant-category").value.trim(), rating: Number($("restaurant-rating").value)
    } });
    state.restaurants.push(restaurant);
    state.loaded = true;
    $("restaurant-form").reset();
    message("restaurant-message", `“${restaurant.name}” cadastrado com sucesso!`, "success");
    renderCategories();
    renderRestaurants();
  } catch (error) { message("restaurant-message", error.message); }
  finally { button.disabled = false; }
});

document.querySelectorAll(".nav-item").forEach(button => button.addEventListener("click", () => switchView(button.dataset.view)));
$("account-button").addEventListener("click", () => switchView("profile"));
$("add-login").addEventListener("click", () => switchView("profile"));
$("profile-add").addEventListener("click", () => switchView("add"));
$("auth-toggle").addEventListener("click", () => setAuthMode(!state.register));
$("logout").addEventListener("click", () => {
  state.token = null; state.user = null;
  $("auth-form").reset();
  $("restaurant-form").reset();
  message("auth-message", "Você saiu da conta.", "success");
  message("restaurant-message");
  updateAccount();
});
$("search").addEventListener("input", () => { state.page = 1; renderRestaurants(); });
$("sort").addEventListener("change", () => { state.page = 1; renderRestaurants(); });
updateAccount();
loadRestaurants();
