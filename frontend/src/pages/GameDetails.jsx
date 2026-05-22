import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import { useCart } from "../context/CartContext.jsx";

export default function GameDetails() {
  const { id } = useParams();
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState({ type: "", message: "" });
  const { addToCart } = useCart();

  useEffect(() => {
    api.getGame(id)
      .then(setGame)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleAddToCart() {
    const result = await addToCart(game);
    setStatus({ type: result.ok ? "success" : "error", message: result.message });
  }

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
          <button className={`button${status.type === "success" ? " button-added" : ""}`} onClick={handleAddToCart}>
            {status.type === "success" ? "✓ Adicionado!" : "Adicionar ao carrinho"}
          </button>
          <Link className="button secondary" to="/catalog">Voltar ao catálogo</Link>
        </div>
        {status.message && <p className={status.type === "success" ? "success" : "error"}>{status.message}</p>}
      </div>
    </section>
  );
}
