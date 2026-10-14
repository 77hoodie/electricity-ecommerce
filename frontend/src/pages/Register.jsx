import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useCart } from "../context/CartContext.jsx";

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { refresh } = useCart();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await register(form);
      await refresh();
      navigate("/catalog");
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
        <h1>Criar conta</h1>
        <p className="muted">Com uma conta, você consegue finalizar compras e manter sua biblioteca persistida.</p>

        <input
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
          placeholder="Nome"
        />
        <input
          value={form.email}
          onChange={(event) => setForm({ ...form, email: event.target.value })}
          placeholder="E-mail"
          type="email"
        />
        <input
          value={form.password}
          onChange={(event) => setForm({ ...form, password: event.target.value })}
          placeholder="Senha com pelo menos 6 caracteres"
          type="password"
        />

        <button className="button" disabled={loading}>{loading ? "Criando..." : "Criar conta"}</button>
        {error && <p className="error">{error}</p>}

        <p className="muted">
          Já tem conta? <Link to="/login">Entrar</Link>
        </p>
      </form>
    </section>
  );
}
