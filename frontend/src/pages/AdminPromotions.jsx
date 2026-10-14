import React, { useEffect, useState } from "react";
import { api } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";

const emptyForm = {
  gameId: "",
  discountPercentage: "10",
  startDate: "2026-01-01",
  endDate: "2026-12-31",
  isActive: true
};

export default function AdminPromotions() {
  const { isAdmin } = useAuth();
  const [promotions, setPromotions] = useState([]);
  const [games, setGames] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadData() {
    const [promotionData, gameData] = await Promise.all([api.listPromotions(), api.listGames()]);
    setPromotions(promotionData);
    setGames(gameData);
    if (!form.gameId && gameData[0]) setForm((current) => ({ ...current, gameId: String(gameData[0].id) }));
  }

  useEffect(() => {
    loadData().catch((err) => setError(err.message));
  }, []);

  if (!isAdmin) {
    return <section className="empty-state"><h1>Acesso restrito</h1><p className="muted">Somente administradores podem gerenciar as promoções.</p></section>;
  }

  function startEdit(promotion) {
    setEditingId(promotion.id);
    setForm({
      gameId: String(promotion.gameId),
      discountPercentage: String(promotion.discountPercentage),
      startDate: promotion.startDate,
      endDate: promotion.endDate,
      isActive: promotion.isActive
    });
    setMessage("");
    setError("");
  }

  function resetForm() {
    setEditingId(null);
    setForm({ ...emptyForm, gameId: games[0] ? String(games[0].id) : "" });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setError("");
    const payload = {
      gameId: Number(form.gameId),
      discountPercentage: Number(form.discountPercentage),
      startDate: form.startDate,
      endDate: form.endDate,
      isActive: Boolean(form.isActive)
    };

    try {
      if (editingId) {
        await api.updatePromotion(editingId, payload);
        setMessage("Promoção atualizada com sucesso.");
      } else {
        await api.createPromotion(payload);
        setMessage("Promoção cadastrada com sucesso.");
      }
      resetForm();
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    setMessage("");
    setError("");
    try {
      await api.deletePromotion(id);
      setMessage("Promoção excluída com sucesso.");
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section>
      <div className="page-title">
        <div>
          <p className="eyebrow">Painel da loja</p>
          <h1>Promoções</h1>
          <p className="muted">Configure descontos e períodos promocionais.</p>
        </div>
      </div>
      <form className="card-form" onSubmit={handleSubmit}>
        <h2>{editingId ? "Editar promoção" : "Cadastrar promoção"}</h2>
        <select value={form.gameId} onChange={(event) => setForm({ ...form, gameId: event.target.value })}>
          {games.map((game) => <option key={game.id} value={game.id}>{game.title}</option>)}
        </select>
        <input value={form.discountPercentage} onChange={(event) => setForm({ ...form, discountPercentage: event.target.value })} placeholder="Desconto %" type="number" min="1" max="90" />
        <input value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} type="date" />
        <input value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} type="date" />
        <label className="checkbox-line">
          <input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} />
          Promoção ativa
        </label>
        <div className="hero-actions">
          <button className="button">{editingId ? "Salvar alterações" : "Cadastrar"}</button>
          {editingId && <button type="button" className="button secondary" onClick={resetForm}>Cancelar</button>}
        </div>
      </form>
      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}
      <div className="table-card">
        <h2>Promoções cadastradas</h2>
        {promotions.map((promotion) => (
          <div className="table-row" key={promotion.id}>
            <span>{promotion.game?.title || `Jogo #${promotion.gameId}`}</span>
            <span>{promotion.discountPercentage}%</span>
            <div className="table-actions">
              <button className="button secondary compact" onClick={() => startEdit(promotion)}>Editar</button>
              <button className="danger compact" onClick={() => handleDelete(promotion.id)}>Excluir</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
