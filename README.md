# Electricity

Electricity é uma plataforma web de venda simulada de jogos digitais, inspirada na Steam. Esta versão inclui front-end navegável, back-end com lógica de negócio, persistência em banco PostgreSQL via Prisma, integração com a RAWG API, carrinho funcional e início da suíte de testes.

## Funcionalidades implementadas

- Catálogo de jogos persistido no banco.
- CRUD completo de jogos.
- CRUD completo de gêneros.
- Integração com RAWG API para busca e importação de jogos.
- Carrinho persistido no PostgreSQL.
- Regra de negócio para impedir jogo duplicado no carrinho.
- Regra de negócio para impedir compra de jogo já presente na biblioteca.
- Checkout simulado com criação de pedido.
- Biblioteca persistida após a compra.
- Testes unitários estruturados.
- Testes de integração iniciados.
- Documentação inicial dos casos de teste em `docs/casos-de-teste.md`.

## Tecnologias utilizadas

### Front-end

- React
- Vite
- React Router

### Back-end

- Node.js
- Express
- Prisma ORM
- PostgreSQL
- RAWG API

### Testes

- Vitest
- Supertest

## Estrutura do projeto

```txt
electricity-ecommerce/
├── docker-compose.yml
├── README.md
├── docs/
│   └── casos-de-teste.md
├── backend/
│   ├── package.json
│   ├── server.js
│   ├── .env.example
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.js
│   ├── src/
│   │   ├── app.js
│   │   ├── cartRules.js
│   │   ├── errors.js
│   │   ├── prisma.js
│   │   ├── rawgMapper.js
│   │   └── serializers.js
│   └── tests/
│       ├── unit/
│       └── integration/
└── frontend/
    ├── package.json
    ├── index.html
    └── src/
        ├── App.jsx
        ├── api.js
        ├── main.jsx
        ├── styles.css
        ├── components/
        ├── context/
        └── pages/
```

## Pré-requisitos

Antes de executar, instale:

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

O banco ficará disponível em:

```txt
postgresql://postgres:postgres@localhost:5432/electricity
```

### 3. Configurar o back-end

```bash
cd backend
npm install
cp .env.example .env
```

Abra o arquivo `.env` e configure sua chave da RAWG:

```env
PORT=3333
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/electricity?schema=public"
RAWG_API_KEY="sua_chave_da_rawg_aqui"
```

### 4. Criar as tabelas no banco

Ainda dentro de `backend`:

```bash
npm run db:push
```

### 5. Popular dados iniciais

```bash
npm run db:seed
```

### 6. Rodar o back-end

```bash
npm run dev
```

O back-end ficará disponível em:

```txt
http://localhost:3333
```

Teste de saúde da API:

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

O front-end ficará disponível em:

```txt
http://localhost:5173
```

## Endpoints principais

### Saúde

```http
GET /api/health
```

### Jogos

```http
GET /api/games
GET /api/games/:id
POST /api/games
PUT /api/games/:id
DELETE /api/games/:id
```

### Gêneros

```http
GET /api/genres
POST /api/genres
PUT /api/genres/:id
DELETE /api/genres/:id
```

### RAWG API

```http
GET /api/rawg/search?query=elden-ring
POST /api/rawg/import/:rawgId
```

### Carrinho, pedidos e biblioteca

```http
GET /api/cart
POST /api/cart/items
DELETE /api/cart/items/:id
DELETE /api/cart
POST /api/orders/checkout
GET /api/orders
GET /api/library
```

## Fluxo para apresentação

1. Subir o banco com `docker compose up -d`.
2. Rodar `npm run db:push` e `npm run db:seed` no back-end.
3. Rodar back-end e front-end.
4. Abrir `http://localhost:5173`.
5. Acessar **Admin Jogos** e demonstrar criação, edição e desativação de jogos.
6. Acessar **Admin Gêneros** e demonstrar criação, edição e exclusão de gêneros.
7. Acessar **Importar RAWG** e buscar um jogo, por exemplo `elden ring`.
8. Importar o jogo para o catálogo.
9. Voltar ao **Catálogo** e verificar que o jogo aparece.
10. Adicionar um jogo ao carrinho.
11. Tentar adicionar o mesmo jogo novamente e mostrar a regra de bloqueio.
12. Finalizar a compra.
13. Abrir a **Biblioteca** e mostrar o jogo comprado persistido.

## Testes

### Testes unitários

```bash
cd backend
npm run test:unit
```

Os testes unitários validam regras como:

- adicionar jogo ativo ao carrinho;
- bloquear jogo duplicado no carrinho;
- bloquear jogo já presente na biblioteca;
- calcular o total do carrinho.

### Testes de integração

Os testes de integração dependem do banco PostgreSQL ativo e das tabelas criadas.

```bash
cd backend
RUN_INTEGRATION=true npm run test:integration
```

No Windows PowerShell:

```powershell
$env:RUN_INTEGRATION="true"; npm run test:integration
```

## Observações

- O arquivo `.env` não deve ser enviado ao GitHub.
- O arquivo `.env.example` deve ser versionado.
- A chave da RAWG fica apenas no back-end.
- O front-end não chama a RAWG diretamente.
- O carrinho desta versão usa um usuário demonstrativo global, pois autenticação real ainda não foi implementada.
- Como os produtos são jogos digitais, o carrinho não permite duplicidade do mesmo jogo.
