import { Link } from "react-router-dom";
import React, { useState } from "react";
import { useCart } from "../context/CartContext.jsx";

export default function GameCard({ game }) {
  const { addToCart } = useCart();
  const [added, setAdded] = useState(false);

  function handleAdd(e) {
    e.preventDefault();
    addToCart(game);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  }

  return (
    <article className="game-card">
      <img src={game.coverUrl} alt={game.title} />
      <div className="game-card-content">
        <h3>{game.title}</h3>
        <p className="muted">{game.genres?.slice(0, 3).join(" • ") || "Sem gênero"}</p>
        <strong>R$ {Number(game.price).toFixed(2)}</strong>
        <button className={`button${added ? " button-added" : ""}`} onClick={handleAdd}>
          {added ? "✓ No carrinho" : "Adicionar ao carrinho"}
        </button>
        <Link className="button secondary" to={`/games/${game.id}`}>Ver detalhes</Link>
      </div>
    </article>
  );
}
