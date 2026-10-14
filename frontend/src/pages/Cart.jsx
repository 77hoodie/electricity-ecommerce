import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function Cart() {
  const { items, removeFromCart, clearCart, purchaseCart, total, loading, lastError } = useCart();
  const { isLoggedIn } = useAuth();
  const [purchased, setPurchased] = useState(false);
  const [localError, setLocalError] = useState("");

  async function handleCheckout() {
    if (!isLoggedIn) {
      setLocalError("Faça login para finalizar a compra e adicionar jogos à biblioteca.");
      return;
    }

    const result = await purchaseCart();
    if (result.ok) {
      setPurchased(true);
      setLocalError("");
    } else {
      setLocalError(result.message);
    }
  }

  async function handleRemove(id) {
    const result = await removeFromCart(id);
    if (!result.ok) setLocalError(result.message);
  }

  async function handleClear() {
    const result = await clearCart();
    if (!result.ok) setLocalError(result.message);
  }

  if (loading) return <p>Carregando carrinho...</p>;

  if (purchased) {
    return (
      <section className="empty-state" style={{ textAlign: "center" }}>
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🎮</div>
        <h1>Compra realizada!</h1>
        <p>O pedido foi salvo no banco e os jogos foram adicionados à biblioteca da sua conta.</p>
        <div className="hero-actions" style={{ justifyContent: "center", marginTop: "1.5rem" }}>
          <Link className="button" to="/library">Ver biblioteca</Link>
          <Link className="button secondary" to="/catalog">Continuar comprando</Link>
        </div>
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section className="empty-state">
        <h1>Carrinho</h1>
        <p className="muted">Seu carrinho está vazio. Visitantes também podem adicionar jogos, mas precisam entrar para finalizar a compra.</p>
        {(lastError || localError) && <p className="error">{lastError || localError}</p>}
        <div className="hero-actions" style={{ marginTop: "1.5rem" }}>
          <Link className="button" to="/catalog">Ver catálogo</Link>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="page-title">
        <div>
          <p className="eyebrow">Loja</p>
          <h1>Carrinho</h1>
          <p className="muted">Visitantes podem montar o carrinho. Para finalizar a compra e salvar na biblioteca, é necessário login.</p>
        </div>
        <button className="button secondary" onClick={handleClear}>Limpar carrinho</button>
      </div>

      {!isLoggedIn && (
        <div className="info-box">
          Você está como visitante. <Link to="/login">Faça login</Link> ou <Link to="/register">crie uma conta</Link> para finalizar a compra.
        </div>
      )}

      {(lastError || localError) && <p className="error">{lastError || localError}</p>}

      <div className="table-card" style={{ marginBottom: "1.5rem" }}>
        {items.map((item) => (
          <div className="table-row cart-row" key={item.id}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <img
                src={item.coverUrl}
                alt={item.title}
                style={{ width: 64, height: 42, objectFit: "cover", borderRadius: "0.5rem", flexShrink: 0 }}
              />
              <div>
                <div style={{ fontWeight: 700 }}>{item.title}</div>
                <div className="muted" style={{ fontSize: "0.85rem" }}>
                  {item.genres?.slice(0, 2).join(" • ")}
                </div>
              </div>
            </div>

            <div style={{ textAlign: "center" }}>
              <span className="pill">Digital</span>
            </div>

            <div style={{ textAlign: "right" }}>
              <div style={{ fontWeight: 700 }}>R$ {Number(item.price).toFixed(2)}</div>
              <button
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.8rem", padding: 0, color: "#f87171" }}
                onClick={() => handleRemove(item.id)}
              >
                remover
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="cart-summary">
        <div className="cart-summary-line">
          <span className="muted">{items.length} jogo(s)</span>
          <span style={{ fontWeight: 800, fontSize: "1.4rem" }}>R$ {total.toFixed(2)}</span>
        </div>
        <button className="button" style={{ width: "100%", padding: "1rem" }} onClick={handleCheckout}>
          {isLoggedIn ? "Finalizar compra" : "Entrar para finalizar"}
        </button>
      </div>
    </section>
  );
}
