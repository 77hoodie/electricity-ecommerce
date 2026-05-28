import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function Orders() {
  const { isLoggedIn, isAdmin } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadOrders() {
    const data = await api.listOrders();
    setOrders(data);
  }

  useEffect(() => {
    if (!isLoggedIn) {
      setLoading(false);
      return;
    }

    loadOrders()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [isLoggedIn]);

  async function handleStatus(orderId, status) {
    setMessage("");
    setError("");
    try {
      await api.updateOrderStatus(orderId, status);
      await loadOrders();
      setMessage("Status do pedido atualizado.");
    } catch (err) {
      setError(err.message);
    }
  }

  if (!isLoggedIn) {
    return (
      <section className="empty-state">
        <h1>Pedidos</h1>
        <p className="muted">Faça login para consultar o histórico de pedidos.</p>
        <Link className="button" to="/login">Entrar</Link>
      </section>
    );
  }

  if (loading) return <p>Carregando pedidos...</p>;

  return (
    <section>
      <div className="page-title">
        <div>
          <p className="eyebrow">Minha conta</p>
          <h1>{isAdmin ? "Todos os pedidos" : "Meus pedidos"}</h1>
          <p className="muted">Acompanhe compras, status e itens adquiridos.</p>
        </div>
      </div>

      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}

      {orders.length === 0 ? (
        <div className="empty-state">Nenhum pedido encontrado.</div>
      ) : (
        <div className="table-card">
          {orders.map((order) => (
            <div className="order-card" key={order.id}>
              <div className="table-row order-header-row">
                <span>Pedido #{order.id}</span>
                <span>R$ {Number(order.total).toFixed(2)}</span>
                <span className="pill">{order.status}</span>
              </div>
              <p className="muted">Criado em {new Date(order.createdAt).toLocaleString("pt-BR")}</p>
              {isAdmin && order.user && <p className="muted">Cliente: {order.user.name} - {order.user.email}</p>}
              <ul>
                {order.items.map((item) => (
                  <li key={item.id}>{item.game?.title} - R$ {Number(item.priceAtPurchase).toFixed(2)}</li>
                ))}
              </ul>
              {isAdmin && (
                <div className="hero-actions">
                  <button className="button secondary compact" onClick={() => handleStatus(order.id, "PAID")}>Pago</button>
                  <button className="button secondary compact" onClick={() => handleStatus(order.id, "PENDING")}>Pendente</button>
                  <button className="danger compact" onClick={() => handleStatus(order.id, "CANCELED")}>Cancelar</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
