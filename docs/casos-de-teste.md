# Casos de Teste — Electricity

Documento inicial da suíte de testes da segunda entrega.

## CT-001 — Adicionar jogo ao carrinho

**Tipo:** Unitário / Integração  
**Objetivo:** Validar que um jogo ativo pode ser adicionado ao carrinho.  
**Pré-condições:** Jogo cadastrado e ativo no banco.  
**Dados de entrada:** `gameId` válido.  
**Passos:**
1. Enviar `POST /api/cart/items` com `gameId`.
2. Consultar `GET /api/cart`.

**Resultado esperado:** O jogo aparece no carrinho com preço salvo no momento da adição.  
**Status:** Em andamento.

## CT-002 — Bloquear jogo duplicado no carrinho

**Tipo:** Unitário / Integração  
**Objetivo:** Garantir que o mesmo jogo digital não seja adicionado duas vezes ao carrinho.  
**Pré-condições:** Jogo já presente no carrinho.  
**Dados de entrada:** Mesmo `gameId` já adicionado.  
**Passos:**
1. Enviar `POST /api/cart/items` com `gameId` já existente.

**Resultado esperado:** API retorna erro `409` com mensagem informando que o jogo já está no carrinho.  
**Status:** Estruturado.

## CT-003 — Finalizar compra

**Tipo:** Integração  
**Objetivo:** Validar o fluxo de checkout.  
**Pré-condições:** Carrinho com pelo menos um item.  
**Dados de entrada:** Carrinho persistido no banco.  
**Passos:**
1. Enviar `POST /api/orders/checkout`.
2. Consultar `GET /api/library`.
3. Consultar `GET /api/cart`.

**Resultado esperado:** Pedido criado, jogo adicionado à biblioteca e carrinho esvaziado.  
**Status:** Em andamento.

## CT-004 — CRUD de jogos

**Tipo:** Integração  
**Objetivo:** Validar criação, listagem, edição e desativação de jogos.  
**Pré-condições:** Banco de dados ativo.  
**Passos:**
1. Criar jogo manualmente.
2. Listar catálogo.
3. Editar dados do jogo.
4. Desativar jogo.

**Resultado esperado:** Todas as operações são refletidas no banco PostgreSQL.  
**Status:** Em andamento.

## CT-005 — CRUD de gêneros

**Tipo:** Integração  
**Objetivo:** Validar criação, listagem, edição e exclusão de gêneros.  
**Pré-condições:** Banco de dados ativo.  
**Passos:**
1. Criar gênero.
2. Listar gêneros.
3. Editar nome do gênero.
4. Excluir gênero.

**Resultado esperado:** Todas as operações são executadas com persistência no banco.  
**Status:** Estruturado.

## CT-006 — Importar jogo da RAWG API

**Tipo:** Integração  
**Objetivo:** Validar consulta à API externa e persistência do jogo importado.  
**Pré-condições:** `RAWG_API_KEY` configurada.  
**Passos:**
1. Pesquisar jogo em `GET /api/rawg/search?query=elden-ring`.
2. Importar jogo com `POST /api/rawg/import/:rawgId`.
3. Consultar `GET /api/games`.

**Resultado esperado:** Jogo importado aparece no catálogo local.  
**Status:** Em andamento.
