import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import GameCard from "../components/GameCard";
import React from "react";

export default function Catalog() {
  const [games, setGames] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.listGames()
      .then(setGames)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filteredGames = useMemo(() => {
    return games.filter((game) =>
      game.title.toLowerCase().includes(search.toLowerCase())
    );
  }, [games, search]);

  if (loading) return <p>Carregando catálogo...</p>;
  if (error) return <p className="error">{error}</p>;

  return (
    <section>
      <div className="page-title">
        <div>
          <p className="eyebrow">Loja</p>
          <h1>Catálogo de jogos</h1>
        </div>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar no catálogo local..."
        />
      </div>

      {filteredGames.length === 0 ? (
        <div className="empty-state">
          Nenhum jogo encontrado. Importe um jogo pela área “Importar RAWG”.
        </div>
      ) : (
        <div className="grid">
          {filteredGames.map((game) => <GameCard key={game.id} game={game} />)}
        </div>
      )}
    </section>
  );
}
