import React, { useEffect, useState } from "react";
import { api } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function AdminUsers() {
  const { isAdmin, user } = useAuth();
  const [users, setUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", role: "USER", password: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadUsers() {
    const data = await api.listUsers();
    setUsers(data);
  }

  useEffect(() => {
    loadUsers().catch((err) => setError(err.message));
  }, []);

  if (!isAdmin) {
    return <section className="empty-state"><h1>Acesso restrito</h1><p className="muted">Somente administradores podem gerenciar usuários.</p></section>;
  }

  function startEdit(selectedUser) {
    setEditingUser(selectedUser);
    setForm({ name: selectedUser.name, email: selectedUser.email, role: selectedUser.role, password: "" });
    setMessage("");
    setError("");
  }

  function resetForm() {
    setEditingUser(null);
    setForm({ name: "", email: "", role: "USER", password: "" });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!editingUser) return;
    setMessage("");
    setError("");

    try {
      const payload = { name: form.name, email: form.email, role: form.role };
      if (form.password) payload.password = form.password;
      await api.updateUser(editingUser.id, payload);
      setMessage("Usuário atualizado com sucesso.");
      resetForm();
      await loadUsers();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    setMessage("");
    setError("");
    try {
      await api.deleteUser(id);
      setMessage("Usuário removido com sucesso.");
      await loadUsers();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section>
      <div className="page-title">
        <div>
          <p className="eyebrow">Painel da loja</p>
          <h1>Usuários</h1>
          <p className="muted">Gerencie perfis e permissões de acesso.</p>
        </div>
      </div>

      {editingUser && (
        <form className="card-form" onSubmit={handleSubmit}>
          <h2>Editar usuário #{editingUser.id}</h2>
          <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Nome" />
          <input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="E-mail" />
          <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
            <option value="USER">USER</option>
            <option value="ADMIN">ADMIN</option>
          </select>
          <input value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="Nova senha opcional" type="password" />
          <div className="hero-actions">
            <button className="button">Salvar usuário</button>
            <button type="button" className="button secondary" onClick={resetForm}>Cancelar</button>
          </div>
        </form>
      )}

      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}

      <div className="table-card">
        <h2>Usuários cadastrados</h2>
        {users.map((item) => (
          <div className="table-row" key={item.id}>
            <span>{item.name}<br /><small className="muted">{item.email}</small></span>
            <span className="pill">{item.role}</span>
            <div className="table-actions">
              <button className="button secondary compact" onClick={() => startEdit(item)}>Editar</button>
              <button className="danger compact" disabled={item.id === user.id} onClick={() => handleDelete(item.id)}>Excluir</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
