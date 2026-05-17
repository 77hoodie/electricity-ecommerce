import { NavLink, Outlet } from "react-router-dom";
import React from "react";
import { useCart } from "./context/CartContext.jsx";

export default function App() {
  const { count } = useCart();
  return (
    <div className="app">
      <header className="header">
        <NavLink to="/" className="logo">Electricity</NavLink>
        <nav>
          <NavLink to="/catalog">Catálogo</NavLink>
          <NavLink to="/cart" className="cart-nav-link">
            Carrinho
            {count > 0 && <span className="cart-badge">{count}</span>}
          </NavLink>
          <NavLink to="/library">Biblioteca</NavLink>
          <NavLink to="/admin/games">Admin Jogos</NavLink>
          <NavLink to="/admin/rawg-import">Importar RAWG</NavLink>
        </nav>
      </header>

      <main className="container">
        <Outlet />
      </main>
    </div>
  );
}
