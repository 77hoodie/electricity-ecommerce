import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import React from "react";

export default function GameDetails() {
  const { id } = useParams();
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getGame(id)
      .then(setGame)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p>Carregando detalhes...</p>;
  if (error) return <p className="error">{error}</p>;
  if (!game) return <p>Jogo não encontrado.</p>;

  return (
    <section className="details">
      <img src={game.coverUrl} alt={game.title} />
      <div>
        <p className="eyebrow">Detalhes do jogo</p>
        <h1>{game.title}</h1>
        <p>{game.description}</p>
        <p><strong>Preço:</strong> R$ {Number(game.price).toFixed(2)}</p>
        <p><strong>Avaliação RAWG:</strong> {game.rating || "Sem nota"}</p>
        <p><strong>Lançamento:</strong> {game.releaseDate || "Não informado"}</p>
        <p><strong>Gêneros:</strong> {game.genres?.join(", ") || "Não informado"}</p>
        <p><strong>Plataformas:</strong> {game.platforms?.slice(0, 8).join(", ") || "Não informado"}</p>
        <div className="hero-actions">
          <button className="button" onClick={() => alert("Protótipo: item adicionado ao carrinho!")}>Adicionar ao carrinho</button>
          <Link className="button secondary" to="/catalog">Voltar ao catálogo</Link>
        </div>
      </div>
    </section>
  );
}
