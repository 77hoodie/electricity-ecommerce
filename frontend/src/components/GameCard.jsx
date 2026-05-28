import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../api.js";

export default function GameCard({ game }) {
  const { addToCart } = useCart();
  const { isLoggedIn } = useAuth();
  const [status, setStatus] = useState({ type: "", message: "" });

  function flash(type, message) {
    setStatus({ type, message });
    setTimeout(() => setStatus({ type: "", message: "" }), 2600);
  }

  async function handleAdd(event) {
    event.preventDefault();
    const result = await addToCart(game);
    flash(result.ok ? "success" : "error", result.message);
  }

  async function handleWishlist(event) {
    event.preventDefault();
    if (!isLoggedIn) {
      flash("error", "Faça login para usar a lista de desejos.");
      return;
    }

    try {
      await api.addWishlist(game.id);
      flash("success", "Jogo adicionado à lista de desejos.");
    } catch (error) {
      flash("error", error.message);
    }
  }

  return (
    <article className="game-card">
      <img src={game.coverUrl} alt={game.title} />
      <div className="game-card-content">
        <h3>{game.title}</h3>
        <p className="muted">{game.genres?.slice(0, 3).join(" • ") || "Sem gênero"}</p>
        <strong>R$ {Number(game.price).toFixed(2)}</strong>
        <button className={`button${status.type === "success" ? " button-added" : ""}`} onClick={handleAdd}>
          {status.type === "success" ? "✓ Adicionado" : "Adicionar ao carrinho"}
        </button>
        <button className="button secondary" onClick={handleWishlist}>Lista de desejos</button>
        {status.message && <small className={status.type === "success" ? "inline-success" : "inline-error"}>{status.message}</small>}
        <Link className="button secondary" to={`/games/${game.id}`}>Ver detalhes</Link>
      </div>
    </article>
  );
}
