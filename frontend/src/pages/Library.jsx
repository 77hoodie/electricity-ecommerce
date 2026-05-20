import React from "react";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext.jsx";

export default function Library() {
  const { library } = useCart();

  if (library.length === 0) {
    return (
      <section className="empty-state">
        <h1>Biblioteca</h1>
        <p className="muted">Você ainda não possui jogos. Finalize uma compra no carrinho para vê-los aqui.</p>
        <div className="hero-actions" style={{ marginTop: "1.5rem" }}>
          <Link className="button" to="/catalog">Ver catálogo</Link>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="page-title">
        <div>
          <p className="eyebrow">Minha conta</p>
          <h1>Biblioteca</h1>
        </div>
        <span className="muted">{library.length} jogo(s)</span>
      </div>

      <div className="grid">
        {library.map((game) => (
          <article className="game-card" key={game.id}>
            <img src={game.coverUrl} alt={game.title} />
            <div className="game-card-content">
              <h3>{game.title}</h3>
              <p className="muted">{game.genres?.slice(0, 3).join(" • ") || "Sem gênero"}</p>
              <span className="success" style={{ textAlign: "center", padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}>
                ✓ Adquirido
              </span>
              <Link className="button secondary" to={`/games/${game.id}`}>Ver detalhes</Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
