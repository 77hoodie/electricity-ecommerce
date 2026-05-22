import React, { useEffect, useState } from "react";
import { api } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function AdminGenres() {
  const { isAdmin } = useAuth();
  const [genres, setGenres] = useState([]);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadGenres() {
    const data = await api.listGenres();
    setGenres(data);
  }

  useEffect(() => {
    loadGenres().catch((err) => setError(err.message));
  }, []);



  if (!isAdmin) {
    return (
      <section className="empty-state">
        <h1>Acesso restrito</h1>
        <p className="muted">Somente administradores podem acessar o CRUD de gêneros.</p>
      </section>
    );
  }
  function startEdit(genre) {
    setEditingId(genre.id);
    setName(genre.name);
    setMessage("");
    setError("");
  }

  function resetForm() {
    setEditingId(null);
    setName("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    try {
      if (editingId) {
        await api.updateGenre(editingId, { name });
        setMessage("Gênero atualizado com sucesso.");
      } else {
        await api.createGenre({ name });
        setMessage("Gênero cadastrado com sucesso.");
      }
      resetForm();
      await loadGenres();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    setMessage("");
    setError("");

    try {
      await api.deleteGenre(id);
      setMessage("Gênero excluído com sucesso.");
      await loadGenres();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section>
      <div className="page-title">
        <div>
          <p className="eyebrow">Administração</p>
          <h1>CRUD de gêneros</h1>
          <p className="muted">Segunda tela CRUD da entrega, com persistência no banco.</p>
        </div>
      </div>

      <form className="card-form" onSubmit={handleSubmit}>
        <h2>{editingId ? "Editar gênero" : "Cadastrar gênero"}</h2>
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nome do gênero" />
        <div className="hero-actions">
          <button className="button">{editingId ? "Salvar alterações" : "Cadastrar"}</button>
          {editingId && <button type="button" className="button secondary" onClick={resetForm}>Cancelar</button>}
        </div>
      </form>

      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}

      <div className="table-card">
        <h2>Gêneros cadastrados</h2>
        {genres.map((genre) => (
          <div className="table-row" key={genre.id}>
            <span>{genre.name}</span>
            <span className="muted">#{genre.id}</span>
            <div className="table-actions">
              <button className="button secondary compact" onClick={() => startEdit(genre)}>Editar</button>
              <button className="danger compact" onClick={() => handleDelete(genre.id)}>Excluir</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
