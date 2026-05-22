import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function Library() {
  const { library, loading, refresh, lastError } = useCart();
  const { isLoggedIn, user } = useAuth();

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (!isLoggedIn) {
    return (
      <section className="empty-state">
        <h1>Biblioteca</h1>
        <p className="muted">A biblioteca é um recurso de usuários autenticados. Faça login para ver seus jogos comprados.</p>
        <div className="hero-actions" style={{ marginTop: "1.5rem" }}>
          <Link className="button" to="/login">Entrar</Link>
          <Link className="button secondary" to="/register">Criar conta</Link>
        </div>
      </section>
    );
  }

  if (loading) return <p>Carregando biblioteca...</p>;

  if (library.length === 0) {
    return (
      <section className="empty-state">
        <h1>Biblioteca</h1>
        <p className="muted">{user?.name}, você ainda não possui jogos. Finalize uma compra no carrinho para vê-los aqui.</p>
        {lastError && <p className="error">{lastError}</p>}
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
          <h1>Biblioteca de {user?.name}</h1>
          <p className="muted">Jogos adquiridos persistidos no banco e vinculados à conta logada.</p>
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
