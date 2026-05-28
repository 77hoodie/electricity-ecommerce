import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Profile() {
  const { user, isLoggedIn, updateProfile } = useAuth();
  const [form, setForm] = useState({ name: user?.name || "", email: user?.email || "", password: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isLoggedIn) {
    return (
      <section className="empty-state">
        <h1>Perfil</h1>
        <p className="muted">Faça login para editar seu perfil.</p>
        <Link className="button" to="/login">Entrar</Link>
      </section>
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);

    try {
      const payload = { name: form.name, email: form.email };
      if (form.password) payload.password = form.password;
      await updateProfile(payload);
      setForm((current) => ({ ...current, password: "" }));
      setMessage("Perfil atualizado com sucesso.");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="auth-page">
      <form className="card-form auth-card" onSubmit={handleSubmit}>
        <p className="eyebrow">Minha conta</p>
        <h1>Perfil</h1>
        <p className="muted">Edite seus dados cadastrais. Deixe a senha vazia para mantê-la.</p>
        <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Nome" />
        <input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="E-mail" type="email" />
        <input value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="Nova senha opcional" type="password" />
        <button className="button" disabled={loading}>{loading ? "Salvando..." : "Salvar perfil"}</button>
        {message && <p className="success">{message}</p>}
        {error && <p className="error">{error}</p>}
      </form>
    </section>
  );
}
