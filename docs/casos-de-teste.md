# Casos de Teste - Electricity

Documento da suíte de testes da entrega final. Os testes foram organizados em três níveis: unitários, integração e end-to-end.

## CT-001 - Cadastrar usuário

**Tipo:** Integração / E2E  
**Objetivo:** Validar criação de conta comum.  
**Pré-condições:** E-mail ainda não cadastrado.  
**Entrada:** Nome, e-mail e senha.  
**Passos:** Enviar `POST /api/auth/register` ou preencher tela de cadastro.  
**Resultado esperado:** Usuário criado com perfil `USER`, sem expor senha.  
**Status:** Implementado.

## CT-002 - Realizar login

**Tipo:** Integração / E2E  
**Objetivo:** Validar autenticação de usuário.  
**Pré-condições:** Usuário cadastrado.  
**Entrada:** E-mail e senha.  
**Passos:** Enviar `POST /api/auth/login` ou usar tela de login.  
**Resultado esperado:** Sistema retorna dados do usuário e libera recursos autenticados.  
**Status:** Implementado.

## CT-003 - Editar perfil

**Tipo:** Integração  
**Objetivo:** Validar edição de nome, e-mail e senha do usuário logado.  
**Pré-condições:** Usuário autenticado.  
**Passos:** Enviar `PUT /api/auth/me`.  
**Resultado esperado:** Perfil atualizado e senha não exposta.  
**Status:** Implementado.

## CT-004 - Visualizar catálogo

**Tipo:** Integração / E2E  
**Objetivo:** Validar carregamento dos jogos ativos.  
**Pré-condições:** Banco com jogos ativos.  
**Passos:** Acessar `GET /api/games` ou a tela de catálogo.  
**Resultado esperado:** Lista de jogos exibida.  
**Status:** Implementado.

## CT-005 - Buscar jogo por nome

**Tipo:** E2E  
**Objetivo:** Validar busca local no catálogo.  
**Pré-condições:** Jogo cadastrado.  
**Passos:** Digitar termo no campo de busca.  
**Resultado esperado:** Catálogo exibe apenas jogos compatíveis.  
**Status:** Implementado.

## CT-006 - Filtrar jogos por gênero ou plataforma

**Tipo:** E2E  
**Objetivo:** Validar filtros do catálogo.  
**Pré-condições:** Jogos com gêneros e plataformas.  
**Passos:** Selecionar gênero ou plataforma.  
**Resultado esperado:** Lista filtrada.  
**Status:** Implementado.

## CT-007 - Visualizar detalhes de um jogo

**Tipo:** Integração / E2E  
**Objetivo:** Validar detalhes do jogo.  
**Pré-condições:** Jogo ativo.  
**Passos:** Acessar `GET /api/games/:id` ou clicar em “Ver detalhes”.  
**Resultado esperado:** Detalhes com preço, gêneros, plataformas e descrição.  
**Status:** Implementado.

## CT-008 - Adicionar jogo ao carrinho

**Tipo:** Unitário / Integração / E2E  
**Objetivo:** Validar adição de jogo ativo ao carrinho.  
**Pré-condições:** Jogo ativo e não duplicado.  
**Passos:** Enviar `POST /api/cart/items`.  
**Resultado esperado:** Item aparece no carrinho com preço salvo no momento da adição.  
**Status:** Implementado.

## CT-009 - Bloquear jogo duplicado no carrinho

**Tipo:** Unitário / Integração  
**Objetivo:** Impedir duplicidade de jogo digital no carrinho.  
**Pré-condições:** Jogo já presente no carrinho.  
**Passos:** Enviar novamente `POST /api/cart/items`.  
**Resultado esperado:** Erro `409`.  
**Status:** Implementado.

## CT-010 - Remover jogo do carrinho

**Tipo:** Integração  
**Objetivo:** Validar remoção de item do carrinho.  
**Pré-condições:** Carrinho com item.  
**Passos:** Enviar `DELETE /api/cart/items/:id`.  
**Resultado esperado:** Item removido.  
**Status:** Implementado.

## CT-011 - Finalizar pedido

**Tipo:** Integração / E2E  
**Objetivo:** Validar checkout simulado.  
**Pré-condições:** Usuário logado e carrinho com item.  
**Passos:** Enviar `POST /api/orders/checkout`.  
**Resultado esperado:** Pedido criado, biblioteca atualizada e carrinho esvaziado.  
**Status:** Implementado.

## CT-012 - Bloquear checkout sem login

**Tipo:** Integração / E2E  
**Objetivo:** Garantir que visitantes não finalizem compra.  
**Pré-condições:** Visitante com carrinho.  
**Passos:** Tentar finalizar compra.  
**Resultado esperado:** Mensagem solicitando login.  
**Status:** Implementado.

## CT-013 - Visualizar biblioteca

**Tipo:** Integração / E2E  
**Objetivo:** Validar jogos comprados na biblioteca.  
**Pré-condições:** Usuário com pedido finalizado.  
**Passos:** Acessar `GET /api/library` ou tela Biblioteca.  
**Resultado esperado:** Jogos adquiridos aparecem persistidos.  
**Status:** Implementado.

## CT-014 - Gerenciar lista de desejos

**Tipo:** Integração  
**Objetivo:** Validar adicionar, listar e remover desejos.  
**Pré-condições:** Usuário logado e jogo ativo.  
**Passos:** Usar `POST`, `GET` e `DELETE /api/wishlist`.  
**Resultado esperado:** Lista de desejos atualizada.  
**Status:** Implementado.

## CT-015 - CRUD de jogos

**Tipo:** Integração / E2E  
**Objetivo:** Validar tela administrativa de jogos.  
**Pré-condições:** Admin logado.  
**Passos:** Criar, listar, editar e desativar jogo.  
**Resultado esperado:** Operações refletidas no banco.  
**Status:** Implementado.

## CT-016 - CRUD de gêneros

**Tipo:** Integração  
**Objetivo:** Validar tela administrativa de gêneros.  
**Pré-condições:** Admin logado.  
**Passos:** Criar, listar, editar e excluir gênero.  
**Resultado esperado:** Operações persistidas.  
**Status:** Implementado.

## CT-017 - CRUD de plataformas

**Tipo:** Integração  
**Objetivo:** Validar tela administrativa de plataformas.  
**Pré-condições:** Admin logado.  
**Passos:** Criar, listar, editar e excluir plataforma.  
**Resultado esperado:** Operações persistidas.  
**Status:** Implementado.

## CT-018 - CRUD de promoções

**Tipo:** Unitário / Integração  
**Objetivo:** Validar cadastro de promoções com regras de período e desconto.  
**Pré-condições:** Admin logado e jogo ativo.  
**Passos:** Criar, listar, editar e excluir promoção.  
**Resultado esperado:** Promoções persistidas e regras validadas.  
**Status:** Implementado.

## CT-019 - Gerenciar usuários

**Tipo:** Integração  
**Objetivo:** Validar listagem, edição e remoção de usuários pelo admin.  
**Pré-condições:** Admin logado.  
**Passos:** Usar `GET`, `PUT` e `DELETE /api/users`.  
**Resultado esperado:** Admin gerencia usuários e não exclui a própria conta.  
**Status:** Implementado.

## CT-020 - Importar jogo da RAWG API

**Tipo:** Integração manual / E2E parcial  
**Objetivo:** Validar consulta à API externa e persistência no catálogo local.  
**Pré-condições:** Admin logado e `RAWG_API_KEY` configurada.  
**Passos:** Buscar jogo em `/api/rawg/search` e importar em `/api/rawg/import/:rawgId`.  
**Resultado esperado:** Jogo importado aparece no catálogo local.  
**Status:** Implementado.

## CT-021 - Proteção de rotas administrativas

**Tipo:** Integração  
**Objetivo:** Garantir que usuário comum não acesse funções admin.  
**Pré-condições:** Usuário comum logado.  
**Passos:** Tentar criar jogo, gênero, plataforma ou promoção.  
**Resultado esperado:** Erro `403`.  
**Status:** Implementado.

## CT-022 - Teste end-to-end de visitante

**Tipo:** E2E  
**Objetivo:** Validar fluxo real no navegador para visitante.  
**Passos:** Abrir catálogo, adicionar ao carrinho e tentar finalizar compra.  
**Resultado esperado:** Carrinho funciona e checkout exige login.  
**Status:** Implementado em Playwright.

## CT-023 - Teste end-to-end de usuário logado

**Tipo:** E2E  
**Objetivo:** Validar fluxo real de compra.  
**Passos:** Login, catálogo, carrinho, checkout e biblioteca.  
**Resultado esperado:** Compra finalizada e jogo aparece na biblioteca.  
**Status:** Implementado em Playwright.

## CT-024 - Teste end-to-end de administrador

**Tipo:** E2E  
**Objetivo:** Validar acesso admin e CRUD de jogos no navegador.  
**Passos:** Login admin, acessar admin, cadastrar jogo.  
**Resultado esperado:** Jogo cadastrado e listado.  
**Status:** Implementado em Playwright.

---

## CT-GEN-01 — Criar gênero automaticamente ao cadastrar jogo

**Objetivo:** Validar que um gênero novo informado no cadastro de jogo é criado na tabela de gêneros e vinculado ao jogo.  
**Pré-condição:** Administrador autenticado.  
**Dados de entrada:** Jogo com gênero `Hip Hop`.  
**Passos:**
1. Acessar o painel de jogos.
2. Cadastrar um jogo preenchendo o campo de gêneros com `Hip Hop`.
3. Acessar o CRUD de gêneros.
4. Verificar se `Hip Hop` aparece na lista.
5. Filtrar o catálogo pelo gênero `Hip Hop`.

**Resultado esperado:** O gênero é criado automaticamente e o jogo aparece ao filtrar por ele.  
**Tipo de teste:** Integração e end-to-end.  
**Status:** Implementado nos testes de integração.

## CT-HOME-01 — Exibir carrossel com jogos do catálogo

**Objetivo:** Validar que a página inicial apresenta jogos cadastrados no catálogo.  
**Pré-condição:** Existem jogos ativos no banco.  
**Passos:**
1. Acessar a página inicial.
2. Aguardar o carregamento dos jogos.
3. Verificar se o destaque exibe título, imagem, preço e botão de detalhes.
4. Clicar em uma miniatura do carrossel.

**Resultado esperado:** O destaque muda para o jogo selecionado e os dados exibidos pertencem ao catálogo.  
**Tipo de teste:** End-to-end.  
**Status:** Documentado para validação final.
