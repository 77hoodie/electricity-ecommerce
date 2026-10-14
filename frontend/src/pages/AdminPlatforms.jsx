import React, { useEffect, useState } from "react";
import { api } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function AdminPlatforms() {
  const { isAdmin } = useAuth();
  const [platforms, setPlatforms] = useState([]);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadPlatforms() {
    const data = await api.listPlatforms();
    setPlatforms(data);
  }

  useEffect(() => {
    loadPlatforms().catch((err) => setError(err.message));
  }, []);

  if (!isAdmin) {
    return <section className="empty-state"><h1>Acesso restrito</h1><p className="muted">Somente administradores podem gerenciar as plataformas.</p></section>;
  }

  function startEdit(platform) {
    setEditingId(platform.id);
    setName(platform.name);
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
        await api.updatePlatform(editingId, { name });
        setMessage("Plataforma atualizada com sucesso.");
      } else {
        await api.createPlatform({ name });
        setMessage("Plataforma cadastrada com sucesso.");
      }
      resetForm();
      await loadPlatforms();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    setMessage("");
    setError("");
    try {
      await api.deletePlatform(id);
      setMessage("Plataforma excluída com sucesso.");
      await loadPlatforms();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section>
      <div className="page-title">
        <div>
          <p className="eyebrow">Painel da loja</p>
          <h1>Plataformas</h1>
          <p className="muted">Controle as plataformas disponíveis para os jogos.</p>
        </div>
      </div>
      <form className="card-form" onSubmit={handleSubmit}>
        <h2>{editingId ? "Editar plataforma" : "Cadastrar plataforma"}</h2>
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nome da plataforma" />
        <div className="hero-actions">
          <button className="button">{editingId ? "Salvar alterações" : "Cadastrar"}</button>
          {editingId && <button type="button" className="button secondary" onClick={resetForm}>Cancelar</button>}
        </div>
      </form>
      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}
      <div className="table-card">
        <h2>Plataformas cadastradas</h2>
        {platforms.map((platform) => (
          <div className="table-row" key={platform.id}>
            <span>{platform.name}</span>
            <span className="muted">#{platform.id}</span>
            <div className="table-actions">
              <button className="button secondary compact" onClick={() => startEdit(platform)}>Editar</button>
              <button className="danger compact" onClick={() => handleDelete(platform.id)}>Excluir</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
