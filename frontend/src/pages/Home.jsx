import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";

export default function Home() {
  const [games, setGames] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.listGames()
      .then((items) => setGames(items.slice(0, 8)))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const activeGame = games[activeIndex] || null;
  const featuredGames = useMemo(() => games.slice(0, 5), [games]);

  useEffect(() => {
    if (featuredGames.length <= 1) return undefined;
    const interval = setInterval(() => {
      setActiveIndex((current) => (current + 1) % featuredGames.length);
    }, 5500);
    return () => clearInterval(interval);
  }, [featuredGames.length]);

  function goTo(index) {
    setActiveIndex(index);
  }

  return (
    <section className="store-home">
      <div className="store-hero">
        <div className="store-hero-copy">
          <p className="eyebrow">Loja digital de jogos</p>
          <h1>Descubra seu próximo jogo favorito.</h1>
          <p>
            Explore lançamentos, favoritos da comunidade e jogos importados de catálogos reais. Monte seu carrinho,
            salve desejos e mantenha sua biblioteca sempre por perto.
          </p>
          <div className="hero-actions">
            <Link className="button" to="/catalog">Explorar catálogo</Link>
            <Link className="button secondary" to="/wishlist">Ver lista de desejos</Link>
          </div>
        </div>

        <div className="carousel-shell">
          {loading && <div className="carousel-placeholder">Carregando destaques...</div>}
          {error && <div className="carousel-placeholder error">{error}</div>}
          {!loading && !error && !activeGame && (
            <div className="carousel-placeholder">
              <h2>Catálogo vazio</h2>
              <p>Cadastre ou importe jogos para exibir os destaques da loja.</p>
              <Link className="button" to="/catalog">Abrir catálogo</Link>
            </div>
          )}
          {activeGame && (
            <article className="featured-carousel" style={{ backgroundImage: `linear-gradient(90deg, rgba(2, 6, 23, 0.96), rgba(2, 6, 23, 0.42)), url(${activeGame.coverUrl})` }}>
              <div className="featured-content">
                <span className="pill">Destaque da loja</span>
                <h2>{activeGame.title}</h2>
                <p>{activeGame.description?.slice(0, 180)}{activeGame.description?.length > 180 ? "..." : ""}</p>
                <div className="featured-meta">
                  <strong>R$ {Number(activeGame.price).toFixed(2)}</strong>
                  {activeGame.rating ? <span>★ {Number(activeGame.rating).toFixed(1)}</span> : null}
                </div>
                <div className="hero-actions">
                  <Link className="button" to={`/games/${activeGame.id}`}>Ver detalhes</Link>
                  <Link className="button secondary" to="/catalog">Mais jogos</Link>
                </div>
              </div>
            </article>
          )}
        </div>
      </div>

      {featuredGames.length > 0 && (
        <div className="carousel-thumbs" aria-label="Jogos em destaque">
          {featuredGames.map((game, index) => (
            <button
              key={game.id}
              className={`carousel-thumb${index === activeIndex ? " active" : ""}`}
              onClick={() => goTo(index)}
              type="button"
            >
              <img src={game.coverUrl} alt="" />
              <span>{game.title}</span>
            </button>
          ))}
        </div>
      )}

      <section className="store-strip">
        <div>
          <strong>Catálogo persistente</strong>
          <span>Jogos salvos no banco e sincronizados com gêneros e plataformas.</span>
        </div>
        <div>
          <strong>Biblioteca pessoal</strong>
          <span>Compras concluídas ficam disponíveis para usuários logados.</span>
        </div>
        <div>
          <strong>RAWG integrada</strong>
          <span>Administradores importam jogos reais direto para a loja.</span>
        </div>
      </section>
    </section>
  );
}
