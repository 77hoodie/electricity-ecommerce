import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext.jsx";

export default function Cart() {
  const { items, removeFromCart, changeQty, clearCart, total } = useCart();
  const [purchased, setPurchased] = useState(false);

  function handleCheckout() {
    clearCart();
    setPurchased(true);
  }

  if (purchased) {
    return (
      <section className="empty-state" style={{ textAlign: "center" }}>
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🎮</div>
        <h1>Compra realizada!</h1>
        <p>Seus jogos foram adicionados à biblioteca. Obrigado!</p>
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
        <p className="muted">Seu carrinho está vazio. Adicione jogos do catálogo para começar.</p>
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
        </div>
        <button className="button secondary" onClick={clearCart}>Limpar carrinho</button>
      </div>

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

            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <button className="qty-btn" onClick={() => changeQty(item.id, -1)}>−</button>
              <span style={{ minWidth: 24, textAlign: "center", fontWeight: 700 }}>{item.qty}</span>
              <button className="qty-btn" onClick={() => changeQty(item.id, +1)}>+</button>
            </div>

            <div style={{ textAlign: "right" }}>
              <div style={{ fontWeight: 700 }}>R$ {(item.price * item.qty).toFixed(2)}</div>
              <button
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.8rem", padding: 0, color: "#f87171" }}
                onClick={() => removeFromCart(item.id)}
              >
                remover
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="cart-summary">
        <div className="cart-summary-line">
          <span className="muted">{items.reduce((s, i) => s + i.qty, 0)} item(s)</span>
          <span style={{ fontWeight: 800, fontSize: "1.4rem" }}>R$ {total.toFixed(2)}</span>
        </div>
        <button className="button" style={{ width: "100%", padding: "1rem" }} onClick={handleCheckout}>
          Finalizar compra
        </button>
      </div>
    </section>
  );
}
