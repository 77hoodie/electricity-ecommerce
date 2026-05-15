import { useEffect, useState } from "react";
import { api } from "../api";
import React from "react";

export default function AdminGames() {
  const [games, setGames] = useState([]);
  const [form, setForm] = useState({ title: "", price: "", description: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadGames() {
    const data = await api.listGames();
    setGames(data);
  }

  useEffect(() => {
    loadGames().catch((err) => setError(err.message));
  }, []);

  async function handleCreate(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    try {
      await api.createGame({
        title: form.title,
        price: Number(form.price),
        description: form.description,
        genres: ["Manual"],
        platforms: ["PC"]
      });
      setForm({ title: "", price: "", description: "" });
      setMessage("Jogo cadastrado com sucesso.");
      await loadGames();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    setError("");
    setMessage("");

    try {
      await api.deleteGame(id);
      setMessage("Jogo desativado com sucesso.");
      await loadGames();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section>
      <div className="page-title">
        <div>
          <p className="eyebrow">Administração</p>
          <h1>CRUD simples de jogos</h1>
          <p className="muted">Nesta Sprint 1, o CRUD usa dados em memória no back-end.</p>
        </div>
      </div>

      <form className="card-form" onSubmit={handleCreate}>
        <h2>Cadastrar jogo manualmente</h2>
        <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Título" />
        <input value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} placeholder="Preço" />
        <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Descrição" />
        <button className="button">Cadastrar</button>
      </form>

      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}

      <div className="table-card">
        <h2>Jogos cadastrados</h2>
        {games.map((game) => (
          <div className="table-row" key={game.id}>
            <span>{game.title}</span>
            <span>R$ {Number(game.price).toFixed(2)}</span>
            <button className="danger" onClick={() => handleDelete(game.id)}>Desativar</button>
          </div>
        ))}
      </div>
    </section>
  );
}
