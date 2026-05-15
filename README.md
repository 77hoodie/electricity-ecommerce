# Electricity

Este repositório contém um protótipo simples de uma plataforma web de venda simulada de jogos digitais, inspirada na Steam.

Essa primeira versão demonstra:

- Front-end navegável com React + Vite.
- Back-end com Node.js + Express.
- CRUD simples de jogos em memória.
- Integração inicial com a RAWG API.
- Fluxo de importação de jogos externos para o catálogo local.

---

## Estrutura do projeto

```txt
gamehub-skeleton/
├── backend/
│   ├── package.json
│   ├── server.js
│   └── .env.example
│
├── frontend/
│   ├── package.json
│   ├── index.html
│   └── src/
│       ├── App.jsx
│       ├── api.js
│       ├── main.jsx
│       ├── styles.css
│       ├── components/
│       │   └── GameCard.jsx
│       └── pages/
│           ├── Home.jsx
│           ├── Catalog.jsx
│           ├── GameDetails.jsx
│           ├── AdminGames.jsx
│           ├── AdminRawgImport.jsx
│           ├── Cart.jsx
│           └── Library.jsx
```

---

## Pré-requisitos

Antes de executar, instale:

- Node.js 20 ou superior
- npm
- Chave da RAWG API

---

## Como obter a chave da RAWG API

1. Acesse o site da RAWG API.
2. Crie uma conta.
3. Gere uma API Key.
4. Use a chave no arquivo `.env` do back-end.

---

## Instalação e execução

### 1. Baixar o projeto

Se estiver usando o `.zip`, extraia a pasta `gamehub-skeleton`.

Depois entre na pasta:

```bash
cd gamehub-skeleton
```

---

### 2. Configurar o back-end

Entre na pasta do back-end:

```bash
cd backend
```

Instale as dependências:

```bash
npm install
```

Crie o arquivo `.env` copiando o exemplo:

```bash
cp .env.example .env
```

Abra o arquivo `.env` e preencha sua chave:

```env
PORT=3333
RAWG_API_KEY=sua_chave_da_rawg_aqui
```

Inicie o back-end:

```bash
npm run dev
```

O back-end ficará disponível em:

```txt
http://localhost:3333
```

Para testar se está funcionando, acesse:

```txt
http://localhost:3333/api/health
```

---

### 3. Configurar o front-end

Abra outro terminal, volte para a raiz do projeto e entre no front-end:

```bash
cd gamehub-skeleton/frontend
```

Instale as dependências:

```bash
npm install
```

Inicie o front-end:

```bash
npm run dev
```

O front-end ficará disponível em:

```txt
http://localhost:5173
```

---

## Fluxo para apresentar

Durante a apresentação, siga este roteiro:

1. Acesse `http://localhost:5173`.
2. Abra a página **Catálogo**.
3. Mostre que existem jogos locais carregados do back-end.
4. Acesse **Importar RAWG**.
5. Pesquise um jogo, por exemplo `elden ring`.
6. Mostre os resultados vindos da RAWG API.
7. Clique em **Importar para catálogo**.
8. Volte ao **Catálogo**.
9. Mostre que o jogo importado aparece na listagem.
10. Clique em **Ver detalhes**.

Esse fluxo demonstra:

- Front-end navegável.
- Back-end funcional.
- Comunicação front-end → back-end.
- Comunicação back-end → RAWG API.
- Persistência temporária em memória.
- CRUD simples de jogos.

---

## Endpoints disponíveis

### Saúde da API

```http
GET /api/health
```

### Jogos locais

```http
GET /api/games
GET /api/games/:id
POST /api/games
PUT /api/games/:id
DELETE /api/games/:id
```

### RAWG API

```http
GET /api/rawg/search?query=elden-ring
POST /api/rawg/import/:rawgId
```

---

## Observações importantes

- A chave da RAWG fica somente no back-end.
- O front-end nunca chama a RAWG diretamente.
- Os dados importados ficam em memória e somem ao reiniciar o back-end.
- Para a versão final, recomenda-se trocar a memória por PostgreSQL + Prisma.

---

## Próximos passos sugeridos

- Adicionar PostgreSQL.
- Adicionar Prisma.
- Criar autenticação com usuário e administrador.
- Persistir jogos importados no banco.
- Implementar carrinho real.
- Implementar pedidos.
- Implementar biblioteca de jogos comprados.
- Adicionar testes unitários, integração e e2e.
