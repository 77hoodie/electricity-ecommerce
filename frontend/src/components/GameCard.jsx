import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext.jsx";

export default function GameCard({ game }) {
  const { addToCart } = useCart();
  const [status, setStatus] = useState({ type: "", message: "" });

  async function handleAdd(e) {
    e.preventDefault();
    const result = await addToCart(game);
    setStatus({ type: result.ok ? "success" : "error", message: result.message });
    setTimeout(() => setStatus({ type: "", message: "" }), 2200);
  }

  return (
    <article className="game-card">
      <img src={game.coverUrl} alt={game.title} />
      <div className="game-card-content">
        <h3>{game.title}</h3>
        <p className="muted">{game.genres?.slice(0, 3).join(" • ") || "Sem gênero"}</p>
        <strong>R$ {Number(game.price).toFixed(2)}</strong>
        <button className={`button${status.type === "success" ? " button-added" : ""}`} onClick={handleAdd}>
          {status.type === "success" ? "✓ No carrinho" : "Adicionar ao carrinho"}
        </button>
        {status.type === "error" && <small className="inline-error">{status.message}</small>}
        <Link className="button secondary" to={`/games/${game.id}`}>Ver detalhes</Link>
      </div>
    </article>
  );
}
