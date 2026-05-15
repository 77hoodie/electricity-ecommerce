import { Link } from "react-router-dom";
import React from "react";

export default function GameCard({ game }) {
  return (
    <article className="game-card">
      <img src={game.coverUrl} alt={game.title} />
      <div className="game-card-content">
        <h3>{game.title}</h3>
        <p className="muted">{game.genres?.slice(0, 3).join(" • ") || "Sem gênero"}</p>
        <strong>R$ {Number(game.price).toFixed(2)}</strong>
        <Link className="button secondary" to={`/games/${game.id}`}>Ver detalhes</Link>
      </div>
    </article>
  );
}
