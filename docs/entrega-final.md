# Entrega Final - Electricity

## Objetivo da entrega

A entrega final tem como objetivo apresentar o sistema completo e funcional, contemplando as cinco telas CRUD, os principais fluxos de usuário, integração com API externa, persistência em banco de dados e testes nos níveis unitário, integração e end-to-end.

## Funcionalidades novas ou revisadas

### 1. Perfis de acesso

Foram consolidados três níveis de acesso:

- Visitante: pode navegar no catálogo, visualizar detalhes e adicionar itens ao carrinho.
- Usuário logado: pode finalizar compra, acessar biblioteca, lista de desejos, pedidos e perfil.
- Administrador: pode acessar todos os recursos, incluindo CRUDs e importação RAWG.

### 2. Carrinho de visitante

O carrinho foi revisado para funcionar também sem login. O visitante recebe um identificador local armazenado no navegador e enviado no header `X-Guest-Cart-Id`. Assim, o carrinho de visitantes deixa de ser compartilhado globalmente.

Ao fazer login, o sistema tenta migrar os itens do carrinho de visitante para o carrinho do usuário logado.

### 3. Cinco telas CRUD administrativas

Foram implementadas as cinco telas CRUD exigidas:

1. Admin Jogos
2. Admin Gêneros
3. Admin Plataformas
4. Admin Promoções
5. Admin Usuários

### 4. Lista de desejos

Usuários autenticados podem adicionar jogos à lista de desejos, visualizar os jogos salvos, remover itens e adicionar jogos desejados ao carrinho.

### 5. Histórico de pedidos

Usuários podem visualizar seus próprios pedidos. Administradores podem visualizar todos os pedidos e alterar o status para `PAID`, `PENDING` ou `CANCELED`.

### 6. Perfil de usuário

Usuários logados podem editar nome, e-mail e senha.

### 7. Catálogo com filtros

O catálogo foi revisado com busca por nome, filtro por gênero e filtro por plataforma.

### 8. Persistência ampliada

O banco PostgreSQL passou a persistir:

- usuários;
- jogos;
- gêneros;
- plataformas;
- promoções;
- carrinho de visitantes e usuários;
- pedidos;
- biblioteca;
- lista de desejos.

### 9. Testes revisados e expandidos

A suíte de testes foi revisada e ampliada:

- Testes unitários: regras do carrinho, promoções, mapeamento RAWG e serializadores.
- Testes de integração: autenticação, CRUDs, carrinho, checkout, biblioteca, desejos, usuários e permissões.
- Testes end-to-end: fluxos reais no navegador com Playwright.

### 10. Relatórios

Foram adicionados relatórios de:

- cobertura de código;
- análise estática de qualidade.

## Casos de uso implementados

| Caso de uso | Status |
|---|---|
| UC01 - Cadastrar usuário | Implementado |
| UC02 - Realizar login | Implementado |
| UC03 - Editar perfil de usuário | Implementado |
| UC04 - Visualizar catálogo de jogos | Implementado |
| UC05 - Buscar jogo por nome | Implementado |
| UC06 - Filtrar jogos por gênero ou plataforma | Implementado |
| UC07 - Visualizar detalhes de um jogo | Implementado |
| UC08 - Adicionar jogo ao carrinho | Implementado |
| UC09 - Remover jogo do carrinho | Implementado |
| UC10 - Finalizar pedido | Implementado |
| UC11 - Visualizar histórico de pedidos | Implementado |
| UC12 - Visualizar biblioteca de jogos | Implementado |
| UC13 - Adicionar jogo à lista de desejos | Implementado |
| UC14 - Remover jogo da lista de desejos | Implementado |
| UC15 - Cadastrar jogo manualmente | Implementado |
| UC16 - Importar jogo da RAWG API | Implementado |
| UC17 - Editar jogo | Implementado |
| UC18 - Excluir ou desativar jogo | Implementado |

## Arquivos principais alterados

### Back-end

- `backend/prisma/schema.prisma`
- `backend/prisma/seed.js`
- `backend/src/app.js`
- `backend/src/serializers.js`
- `backend/src/promotionRules.js`
- `backend/tests/unit/*`
- `backend/tests/integration/api.integration.test.js`
- `backend/vitest.config.js`
- `backend/scripts/static-analysis.js`
- `backend/package.json`

### Front-end

- `frontend/src/api.js`
- `frontend/src/App.jsx`
- `frontend/src/main.jsx`
- `frontend/src/context/AuthContext.jsx`
- `frontend/src/context/CartContext.jsx`
- `frontend/src/components/GameCard.jsx`
- `frontend/src/pages/*`
- `frontend/src/styles.css`
- `frontend/e2e/electricity.spec.js`
- `frontend/playwright.config.js`
- `frontend/package.json`

### Documentação e relatórios

- `README.md`
- `docs/casos-de-teste.md`
- `docs/entrega-final.md`
- `reports/coverage-summary.md`
- `reports/static-analysis-report.md`

## Resultado dos testes unitários executados

Foram executados os testes unitários com sucesso:

```txt
Test Files: 4 passed
Tests: 16 passed
```

## Resultado de cobertura gerado

```txt
Linhas: 96.8%
Statements: 96.8%
Funções: 100%
Branches: 61.76%
```

A meta solicitada era 70-80%, portanto a cobertura de linhas e statements ficou acima da meta.

## Observações finais

Os testes de integração e end-to-end dependem do banco PostgreSQL e do back-end em execução no ambiente local. Os comandos estão documentados no README.
