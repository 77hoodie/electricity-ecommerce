import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useCart } from "../context/CartContext.jsx";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { refresh } = useCart();
  const [form, setForm] = useState({ email: "user@electricity.com", password: "user123" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const user = await login(form);
      await refresh();
      navigate(user.role === "ADMIN" ? "/admin/games" : "/catalog");
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
        <h1>Entrar</h1>
        <p className="muted">Faça login para finalizar compras e adicionar jogos à sua biblioteca.</p>

        <input
          value={form.email}
          onChange={(event) => setForm({ ...form, email: event.target.value })}
          placeholder="E-mail"
          type="email"
        />
        <input
          value={form.password}
          onChange={(event) => setForm({ ...form, password: event.target.value })}
          placeholder="Senha"
          type="password"
        />

        <button className="button" disabled={loading}>{loading ? "Entrando..." : "Entrar"}</button>
        {error && <p className="error">{error}</p>}

        <div className="login-hints">
          <strong>Acessos rápidos:</strong>
          <span>Usuário: user@electricity.com / user123</span>
          <span>Admin: admin@electricity.com / admin123</span>
        </div>

        <p className="muted">
          Ainda não tem conta? <Link to="/register">Criar conta</Link>
        </p>
      </form>
    </section>
  );
}
