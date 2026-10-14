import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api.js";
import GameCard from "../components/GameCard.jsx";

export default function Catalog() {
  const [games, setGames] = useState([]);
  const [search, setSearch] = useState("");
  const [genre, setGenre] = useState("");
  const [platform, setPlatform] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.listGames()
      .then(setGames)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const genres = useMemo(() => [...new Set(games.flatMap((game) => game.genres || []))].sort(), [games]);
  const platforms = useMemo(() => [...new Set(games.flatMap((game) => game.platforms || []))].sort(), [games]);

  const filteredGames = useMemo(() => {
    return games.filter((game) => {
      const matchesSearch = game.title.toLowerCase().includes(search.toLowerCase());
      const matchesGenre = !genre || game.genres?.includes(genre);
      const matchesPlatform = !platform || game.platforms?.includes(platform);
      return matchesSearch && matchesGenre && matchesPlatform;
    });
  }, [games, search, genre, platform]);

  if (loading) return <p>Carregando catálogo...</p>;
  if (error) return <p className="error">{error}</p>;

  return (
    <section>
      <div className="page-title">
        <div>
          <p className="eyebrow">Loja</p>
          <h1>Catálogo de jogos</h1>
          <p className="muted">Busca e filtros por nome, gênero e plataforma.</p>
        </div>
      </div>

      <div className="filters-row">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar no catálogo local..." />
        <select value={genre} onChange={(event) => setGenre(event.target.value)}>
          <option value="">Todos os gêneros</option>
          {genres.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <select value={platform} onChange={(event) => setPlatform(event.target.value)}>
          <option value="">Todas as plataformas</option>
          {platforms.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </div>

      {filteredGames.length === 0 ? (
        <div className="empty-state">Nenhum jogo encontrado com os filtros selecionados.</div>
      ) : (
        <div className="grid">
          {filteredGames.map((game) => <GameCard key={game.id} game={game} />)}
        </div>
      )}
    </section>
  );
}
