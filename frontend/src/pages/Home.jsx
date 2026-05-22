import React from "react";
import { Link } from "react-router-dom";

export default function Home() {
  return (
    <section className="hero">
      <div>
        <p className="eyebrow">Entrega funcional</p>
        <h1>Electricity</h1>
        <p>
          Plataforma web de venda simulada de jogos digitais com React, Express, Prisma,
          PostgreSQL, carrinho persistente e integração com a RAWG API.
        </p>
        <div className="hero-actions">
          <Link className="button" to="/catalog">Ver catálogo</Link>
          <Link className="button secondary" to="/admin/rawg-import">Testar RAWG API</Link>
        </div>
      </div>
      <div className="hero-card">
        <h2>Fluxos demonstráveis</h2>
        <ol>
          <li>CRUD de jogos persistido no PostgreSQL</li>
          <li>CRUD de gêneros persistido no PostgreSQL</li>
          <li>Importação de jogos da RAWG API</li>
          <li>Carrinho e biblioteca com dados persistentes</li>
        </ol>
      </div>
    </section>
  );
}
