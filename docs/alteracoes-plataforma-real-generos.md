# Alterações realizadas — experiência de plataforma, carrossel e vínculo de gêneros

## Objetivo

Foram feitas melhorias para deixar a Electricity com aparência e comportamento mais próximos de uma plataforma real de venda de jogos, sem linguagem visual de entrega acadêmica na interface principal. Também foi corrigido o vínculo entre jogos, gêneros e plataformas no banco de dados.

## 1. Página inicial com carrossel de jogos

A página inicial deixou de exibir um texto com cara de documentação do projeto e passou a carregar jogos reais do catálogo.

### O que foi feito

- A Home agora consulta `GET /api/games`.
- Os jogos do catálogo aparecem em um carrossel de destaque.
- O carrossel troca automaticamente o jogo ativo a cada alguns segundos.
- O usuário pode selecionar manualmente o jogo pelos cards menores abaixo do destaque.
- Cada destaque exibe capa, título, descrição resumida, preço, avaliação e botões para detalhes e catálogo.

### Arquivos alterados

- `frontend/src/pages/Home.jsx`
- `frontend/src/styles.css`

## 2. Correção do vínculo entre jogos e gêneros

Antes, quando um jogo era cadastrado com um gênero escrito manualmente, como `Hip Hop`, esse valor ficava apenas dentro do campo de texto/lista do jogo. Ele não criava nem vinculava corretamente o registro na tabela de gêneros.

Agora, ao criar ou editar um jogo, o back-end faz a sincronização automática:

1. Lê a lista de gêneros enviada no formulário do jogo.
2. Remove espaços e duplicidades.
3. Cria automaticamente os gêneros inexistentes na tabela `Genre`.
4. Cria o vínculo entre o jogo e os gêneros por meio da tabela relacional `GameGenre`.
5. Mantém o campo legado `genres` sincronizado para preservar compatibilidade com telas e filtros existentes.

Com isso, se o administrador cadastrar um jogo com o gênero `Hip Hop`, esse gênero passa a existir na tela/tabela de gêneros e o jogo fica associado a ele.

### Arquivos alterados

- `backend/prisma/schema.prisma`
- `backend/src/app.js`
- `backend/src/serializers.js`
- `backend/prisma/seed.js`

## 3. Vínculo entre jogos e plataformas

A mesma lógica foi aplicada às plataformas para manter consistência com o domínio da aplicação.

Ao cadastrar um jogo com uma plataforma nova, ela também é criada automaticamente em `Platform` e vinculada ao jogo por meio de `GamePlatform`.

## 4. Modelagem adicionada ao Prisma

Foram criadas duas tabelas relacionais:

```prisma
model GameGenre {
  gameId  Int
  genreId Int

  game  Game  @relation(fields: [gameId], references: [id], onDelete: Cascade)
  genre Genre @relation(fields: [genreId], references: [id], onDelete: Cascade)

  @@id([gameId, genreId])
  @@index([genreId])
}

model GamePlatform {
  gameId     Int
  platformId Int

  game     Game     @relation(fields: [gameId], references: [id], onDelete: Cascade)
  platform Platform @relation(fields: [platformId], references: [id], onDelete: Cascade)

  @@id([gameId, platformId])
  @@index([platformId])
}
```

## 5. Ajuste nos filtros do catálogo

O endpoint `GET /api/games` agora aceita filtros por gênero e plataforma usando tanto os campos antigos quanto os novos vínculos relacionais.

Também foi incluída uma sincronização automática de compatibilidade: ao listar gêneros ou plataformas, o back-end verifica jogos antigos que ainda tenham apenas arrays de texto e cria os vínculos relacionais correspondentes.

Exemplo:

```http
GET /api/games?genre=Hip%20Hop
```

Isso retorna jogos associados ao gênero `Hip Hop`.

## 6. Importação RAWG sincronizada

A importação pela RAWG também passou a sincronizar os gêneros e plataformas importados:

- cria gêneros que ainda não existem;
- cria plataformas que ainda não existem;
- vincula tudo ao jogo importado;
- mantém o catálogo e os filtros funcionando.

## 7. Seed atualizado

O seed inicial passou a sincronizar os jogos de exemplo com as tabelas relacionais de gêneros e plataformas.

Também foi adicionado o gênero `Simulação`, usado pelo jogo Stardew Valley.

## 8. Testes revisados

Foram adicionadas validações para garantir que:

- um jogo cadastrado com gênero novo cria esse gênero automaticamente;
- o gênero criado aparece em `GET /api/genres`;
- o filtro por gênero retorna o jogo vinculado;
- o serializador prioriza os vínculos relacionais quando eles vêm do banco.

### Arquivos alterados

- `backend/tests/integration/api.integration.test.js`
- `backend/tests/unit/serializers.test.js`

## 9. Comandos necessários após atualizar

Como houve alteração no schema do Prisma, é necessário recriar/atualizar as tabelas:

```bash
cd backend
npm run db:push
npm run db:seed
```

Se o banco local tiver dados antigos e der conflito, pode ser necessário reiniciar o volume do Docker:

```bash
docker compose down -v
docker compose up -d
cd backend
npm run db:push
npm run db:seed
```

Atenção: `docker compose down -v` apaga os dados locais do banco.
