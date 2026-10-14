import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useCart } from "../context/CartContext.jsx";

export default function Wishlist() {
  const { isLoggedIn } = useAuth();
  const { addToCart } = useCart();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadWishlist() {
    const data = await api.listWishlist();
    setItems(data);
  }

  useEffect(() => {
    if (!isLoggedIn) {
      setLoading(false);
      return;
    }

    loadWishlist()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [isLoggedIn]);

  async function handleRemove(gameId) {
    setMessage("");
    setError("");
    try {
      await api.removeWishlist(gameId);
      await loadWishlist();
      setMessage("Jogo removido da lista de desejos.");
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleAddToCart(game) {
    const result = await addToCart(game);
    if (result.ok) setMessage(result.message);
    else setError(result.message);
  }

  if (!isLoggedIn) {
    return (
      <section className="empty-state">
        <h1>Lista de desejos</h1>
        <p className="muted">Faça login para salvar jogos na sua lista de desejos.</p>
        <div className="hero-actions" style={{ marginTop: "1.5rem" }}>
          <Link className="button" to="/login">Entrar</Link>
          <Link className="button secondary" to="/register">Criar conta</Link>
        </div>
      </section>
    );
  }

  if (loading) return <p>Carregando lista de desejos...</p>;

  return (
    <section>
      <div className="page-title">
        <div>
          <p className="eyebrow">Minha conta</p>
          <h1>Lista de desejos</h1>
          <p className="muted">Jogos salvos para comprar depois.</p>
        </div>
      </div>

      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}

      {items.length === 0 ? (
        <div className="empty-state">
          <p>Sua lista de desejos está vazia.</p>
          <Link className="button" to="/catalog">Ver catálogo</Link>
        </div>
      ) : (
        <div className="grid">
          {items.map((game) => (
            <article className="game-card" key={game.id}>
              <img src={game.coverUrl} alt={game.title} />
              <div className="game-card-content">
                <h3>{game.title}</h3>
                <p className="muted">{game.genres?.slice(0, 3).join(" • ") || "Sem gênero"}</p>
                <strong>R$ {Number(game.price).toFixed(2)}</strong>
                <button className="button" onClick={() => handleAddToCart(game)}>Adicionar ao carrinho</button>
                <button className="button secondary" onClick={() => handleRemove(game.id)}>Remover dos desejos</button>
                <Link className="button secondary" to={`/games/${game.id}`}>Ver detalhes</Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
