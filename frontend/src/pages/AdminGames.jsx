import React, { useEffect, useState } from "react";
import { api } from "../api";

const emptyForm = {
  title: "",
  price: "",
  description: "",
  coverUrl: "",
  genres: "",
  platforms: ""
};

export default function AdminGames() {
  const [games, setGames] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadGames() {
    const data = await api.listGames();
    setGames(data);
  }

  useEffect(() => {
    loadGames().catch((err) => setError(err.message));
  }, []);

  function startEdit(game) {
    setEditingId(game.id);
    setForm({
      title: game.title || "",
      price: String(game.price ?? ""),
      description: game.description || "",
      coverUrl: game.coverUrl || "",
      genres: game.genres?.join(", ") || "",
      platforms: game.platforms?.join(", ") || ""
    });
    setMessage("");
    setError("");
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    const payload = {
      title: form.title,
      price: Number(form.price),
      description: form.description,
      coverUrl: form.coverUrl,
      genres: form.genres,
      platforms: form.platforms
    };

    try {
      if (editingId) {
        await api.updateGame(editingId, payload);
        setMessage("Jogo atualizado com sucesso.");
      } else {
        await api.createGame(payload);
        setMessage("Jogo cadastrado com sucesso.");
      }
      cancelEdit();
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
          <h1>CRUD de jogos</h1>
          <p className="muted">Operações persistidas no PostgreSQL via Prisma.</p>
        </div>
      </div>

      <form className="card-form" onSubmit={handleSubmit}>
        <h2>{editingId ? "Editar jogo" : "Cadastrar jogo manualmente"}</h2>
        <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Título" />
        <input value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} placeholder="Preço" type="number" min="0" step="0.01" />
        <input value={form.coverUrl} onChange={(event) => setForm({ ...form, coverUrl: event.target.value })} placeholder="URL da capa" />
        <input value={form.genres} onChange={(event) => setForm({ ...form, genres: event.target.value })} placeholder="Gêneros separados por vírgula" />
        <input value={form.platforms} onChange={(event) => setForm({ ...form, platforms: event.target.value })} placeholder="Plataformas separadas por vírgula" />
        <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Descrição" />
        <div className="hero-actions">
          <button className="button">{editingId ? "Salvar alterações" : "Cadastrar"}</button>
          {editingId && <button type="button" className="button secondary" onClick={cancelEdit}>Cancelar</button>}
        </div>
      </form>

      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}

      <div className="table-card">
        <h2>Jogos cadastrados</h2>
        {games.map((game) => (
          <div className="table-row" key={game.id}>
            <span>{game.title}</span>
            <span>R$ {Number(game.price).toFixed(2)}</span>
            <div className="table-actions">
              <button className="button secondary compact" onClick={() => startEdit(game)}>Editar</button>
              <button className="danger compact" onClick={() => handleDelete(game.id)}>Desativar</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
