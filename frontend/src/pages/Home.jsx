import { Link } from "react-router-dom";
import React from "react";

export default function Home() {
  return (
    <section className="hero">
      <div>
        <p className="eyebrow">Teste</p>
        <h1>Electricity</h1>
        <p>
          Protótipo funcional de uma plataforma web de venda simulada de jogos digitais,
          com front-end, back-end e integração inicial com a RAWG API.
        </p>
        <div className="hero-actions">
          <Link className="button" to="/catalog">Ver catálogo</Link>
          <Link className="button secondary" to="/admin/rawg-import">Testar RAWG API</Link>
        </div>
      </div>
      <div className="hero-card">
        <h2>Fluxo demonstrável</h2>
        <ol>
          <li>Pesquisar jogo na RAWG</li>
          <li>Importar para o catálogo local</li>
          <li>Visualizar no catálogo</li>
          <li>Acessar detalhes do jogo</li>
        </ol>
      </div>
    </section>
  );
}
