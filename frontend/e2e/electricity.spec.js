import { expect, test } from "@playwright/test";

const apiBase = process.env.E2E_API_URL || "http://localhost:3333/api";

async function loginApi(request, email, password) {
  const response = await request.post(`${apiBase}/auth/login`, { data: { email, password } });
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function createGame(request, title) {
  const admin = await loginApi(request, "admin@electricity.com", "admin123");
  const response = await request.post(`${apiBase}/games`, {
    headers: { "X-User-Id": String(admin.id) },
    data: {
      title,
      price: 19.9,
      description: "Jogo criado pelo teste end-to-end.",
      genres: "E2E, Ação",
      platforms: "PC"
    }
  });
  expect(response.ok()).toBeTruthy();
  return response.json();
}

test("visitante navega no catálogo, adiciona ao carrinho e é orientado a fazer login", async ({ page, request }) => {
  const title = `E2E Visitante ${Date.now()}`;
  await createGame(request, title);

  await page.goto("/catalog");
  await page.getByPlaceholder("Buscar no catálogo local...").fill(title);
  await page.getByRole("button", { name: /adicionar ao carrinho/i }).first().click();
  await expect(page.getByText(/adicionado/i).first()).toBeVisible();

  await page.getByRole("link", { name: /carrinho/i }).click();
  await expect(page.getByText(title)).toBeVisible();
  await page.getByRole("button", { name: /entrar para finalizar/i }).click();
  await expect(page.getByText(/faça login para finalizar/i)).toBeVisible();
});

test("usuário logado finaliza compra e vê jogo na biblioteca", async ({ page, request }) => {
  const title = `E2E Compra ${Date.now()}`;
  await createGame(request, title);

  await page.goto("/login");
  await page.getByPlaceholder("E-mail").fill("user@electricity.com");
  await page.getByPlaceholder("Senha").fill("user123");
  await page.getByRole("button", { name: /^entrar$/i }).click();

  await page.goto("/catalog");
  await page.getByPlaceholder("Buscar no catálogo local...").fill(title);
  await page.getByRole("button", { name: /adicionar ao carrinho/i }).first().click();
  await page.getByRole("link", { name: /carrinho/i }).click();
  await page.getByRole("button", { name: /finalizar compra/i }).click();
  await expect(page.getByText(/compra realizada/i)).toBeVisible();
  await page.getByRole("link", { name: /ver biblioteca/i }).click();
  await expect(page.getByText(title)).toBeVisible();
});

test("administrador acessa área administrativa e CRUD de jogos", async ({ page }) => {
  const title = `E2E Admin ${Date.now()}`;

  await page.goto("/login");
  await page.getByPlaceholder("E-mail").fill("admin@electricity.com");
  await page.getByPlaceholder("Senha").fill("admin123");
  await page.getByRole("button", { name: /^entrar$/i }).click();

  await page.getByRole("link", { name: /^painel$/i }).click();
  await expect(page.getByRole("heading", { name: /gerenciar jogos/i })).toBeVisible();

  await page.getByPlaceholder("Título").fill(title);
  await page.getByPlaceholder("Preço").fill("29.90");
  await page.getByPlaceholder("Descrição").fill("Cadastro feito por teste e2e.");
  await page.getByRole("button", { name: /^cadastrar$/i }).click();
  await expect(page.getByText(/jogo cadastrado com sucesso/i)).toBeVisible();
  await expect(page.getByText(title)).toBeVisible();
});
