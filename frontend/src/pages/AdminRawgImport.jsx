import { useState } from "react";
import { api } from "../api";
import React from "react";

export default function AdminRawgImport() {
  const [query, setQuery] = useState("elden ring");
  const [price, setPrice] = useState("99.90");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSearch(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const data = await api.searchRawg(query);
      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleImport(rawgId) {
    setError("");
    setMessage("");

    try {
      const imported = await api.importRawg(rawgId, Number(price));
      setMessage(`Jogo importado com sucesso: ${imported.title}`);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section>
      <div className="page-title">
        <div>
          <p className="eyebrow">Administração</p>
          <h1>Importar jogos da RAWG</h1>
          <p className="muted">Essa tela demonstra a integração entre front-end, back-end e API externa.</p>
        </div>
      </div>

      <form className="form-row" onSubmit={handleSearch}>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nome do jogo" />
        <input value={price} onChange={(event) => setPrice(event.target.value)} placeholder="Preço local" />
        <button className="button" disabled={loading}>{loading ? "Buscando..." : "Buscar na RAWG"}</button>
      </form>

      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}

      <div className="rawg-list">
        {results.map((game) => (
          <article key={game.rawgId} className="rawg-item">
            <img src={game.coverUrl || "https://placehold.co/200x120?text=GameHub"} alt={game.title} />
            <div>
              <h3>{game.title}</h3>
              <p className="muted">{game.genres?.slice(0, 3).join(" • ") || "Sem gênero"}</p>
              <p>Lançamento: {game.releaseDate || "Não informado"} • Nota: {game.rating || "Sem nota"}</p>
              <button className="button secondary" onClick={() => handleImport(game.rawgId)}>
                Importar para catálogo
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
