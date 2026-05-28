# Electricity

Electricity é uma plataforma web de venda simulada de jogos digitais, inspirada na Steam. A versão final inclui front-end navegável, back-end com lógica de negócio, persistência em PostgreSQL via Prisma, integração com a RAWG API, carrinho para visitantes, autenticação por perfil, biblioteca, lista de desejos, cinco telas CRUD administrativas, testes unitários, testes de integração, testes end-to-end, relatório de cobertura e relatório de análise estática.

## Funcionalidades implementadas

- Cadastro, login, logout e edição de perfil.
- Visitante pode navegar, filtrar jogos e adicionar itens ao carrinho.
- Usuário logado pode finalizar compra, ver biblioteca, pedidos e lista de desejos.
- Admin pode acessar todos os recursos e as telas administrativas.
- Página inicial com carrossel de jogos vindos do catálogo.
- Catálogo com busca, filtro por gênero e filtro por plataforma.
- Detalhes do jogo com botão para carrinho e lista de desejos.
- Carrinho persistido por visitante ou usuário logado.
- Checkout simulado com criação de pedido e adição à biblioteca.
- Histórico de pedidos com atualização de status pelo admin.
- Integração com RAWG API para busca e importação de jogos.
- Criação automática e vínculo relacional de gêneros e plataformas ao cadastrar ou importar jogos.
- Cinco telas CRUD: jogos, gêneros, plataformas, promoções e usuários.
- Suíte de testes unitários, integração e end-to-end.
- Relatório de cobertura em `backend/coverage/index.html`.
- Relatório de qualidade em `reports/static-analysis-report.md`.

## Tecnologias utilizadas

### Front-end

- React
- Vite
- React Router
- Playwright para testes end-to-end

### Back-end

- Node.js
- Express
- Prisma ORM
- PostgreSQL
- RAWG API

### Testes e qualidade

- Vitest
- Supertest
- Playwright
- Coverage V8
- Script de análise estática local

## Estrutura do projeto

```txt
electricity-ecommerce/
├── docker-compose.yml
├── README.md
├── docs/
│   ├── casos-de-teste.md
│   ├── entrega-final.md
│   └── alteracoes-plataforma-real-generos.md
├── reports/
│   ├── coverage-summary.md
│   └── static-analysis-report.md
├── backend/
│   ├── package.json
│   ├── server.js
│   ├── .env.example
│   ├── coverage/
│   ├── prisma/
│   ├── scripts/
│   ├── src/
│   └── tests/
│       ├── unit/
│       └── integration/
└── frontend/
    ├── package.json
    ├── playwright.config.js
    ├── e2e/
    ├── index.html
    └── src/
```

## Pré-requisitos

- Node.js 20 ou superior
- npm
- Docker
- Docker Compose
- Chave da RAWG API

## Instalação e execução

### 1. Entrar na pasta do projeto

```bash
cd electricity-ecommerce
```

### 2. Subir o PostgreSQL

Na raiz do projeto:

```bash
docker compose up -d
```

O `docker-compose.yml` usa a porta externa `5433` para evitar conflito com PostgreSQL local:

```txt
postgresql://postgres:postgres@localhost:5433/electricity
```

### 3. Configurar o back-end

```bash
cd backend
npm install
cp .env.example .env
```

Configure o `.env`:

```env
PORT=3333
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/electricity?schema=public"
RAWG_API_KEY="sua_chave_da_rawg_aqui"
```

### 4. Criar as tabelas

```bash
npm run db:push
```

### 5. Popular dados iniciais

```bash
npm run db:seed
```

Contas criadas pelo seed:

```txt
Admin: admin@electricity.com / admin123
Usuário: user@electricity.com / user123
```

### 6. Rodar o back-end

```bash
npm run dev
```

API:

```txt
http://localhost:3333/api/health
```

### 7. Rodar o front-end

Em outro terminal:

```bash
cd electricity-ecommerce/frontend
npm install
npm run dev
```

Front-end:

```txt
http://localhost:5173
```

## Endpoints principais

### Auth e usuários

```http
POST /api/auth/register
POST /api/auth/login
GET /api/auth/me
PUT /api/auth/me
GET /api/users
PUT /api/users/:id
DELETE /api/users/:id
```

### Jogos

```http
GET /api/games
GET /api/games/:id
POST /api/games
PUT /api/games/:id
DELETE /api/games/:id
```

### Gêneros, plataformas e promoções

```http
GET /api/genres
POST /api/genres
PUT /api/genres/:id
DELETE /api/genres/:id

GET /api/platforms
POST /api/platforms
PUT /api/platforms/:id
DELETE /api/platforms/:id

GET /api/promotions
POST /api/promotions
PUT /api/promotions/:id
DELETE /api/promotions/:id
```

### RAWG API

```http
GET /api/rawg/search?query=elden-ring
POST /api/rawg/import/:rawgId
```

### Carrinho, pedidos, biblioteca e lista de desejos

```http
GET /api/cart
POST /api/cart/items
DELETE /api/cart/items/:id
DELETE /api/cart
POST /api/cart/merge-guest
POST /api/orders/checkout
GET /api/orders
PATCH /api/orders/:id/status
GET /api/library
GET /api/wishlist
POST /api/wishlist/:gameId
DELETE /api/wishlist/:gameId
```

## Testes

### Testes unitários

```bash
cd backend
npm run test:unit
```

### Testes de integração

Os testes de integração dependem do banco ativo, `db:push` e `db:seed` executados.

Linux/macOS/Git Bash:

```bash
cd backend
RUN_INTEGRATION=true npm run test:integration
```

PowerShell:

```powershell
cd backend
$env:RUN_INTEGRATION="true"; npm run test:integration
```

### Cobertura de código

```bash
cd backend
npm run test:coverage
```

Relatórios gerados:

```txt
backend/coverage/index.html
backend/coverage/coverage-summary.json
reports/coverage-summary.md
```

### Testes end-to-end

Antes de rodar, deixe o back-end ativo em `http://localhost:3333`.

Na primeira vez, instale o browser do Playwright:

```bash
cd frontend
npx playwright install chromium
```

Depois execute:

```bash
npm run test:e2e
```

Relatório HTML:

```bash
npm run test:e2e:report
```

### Análise estática de qualidade

```bash
cd backend
npm run quality:report
```

Relatório gerado:

```txt
reports/static-analysis-report.md
```

## Fluxo para apresentação final

1. Subir o PostgreSQL com `docker compose up -d`.
2. Rodar `npm run db:push` e `npm run db:seed` no back-end.
3. Rodar back-end e front-end.
4. Entrar como visitante, navegar pelo catálogo e adicionar jogo ao carrinho.
5. Tentar finalizar compra como visitante e mostrar bloqueio por login.
6. Entrar como usuário comum e finalizar compra.
7. Abrir biblioteca, pedidos, lista de desejos e perfil.
8. Entrar como admin.
9. Demonstrar os cinco CRUDs: jogos, gêneros, plataformas, promoções e usuários.
10. Demonstrar que um gênero novo, como Hip Hop, é criado automaticamente ao cadastrar um jogo.
11. Demonstrar a página inicial com carrossel baseado no catálogo.
12. Demonstrar importação RAWG para o catálogo local.
11. Executar testes unitários, integração, e2e, cobertura e relatório de qualidade.
