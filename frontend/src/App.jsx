import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useCart } from "./context/CartContext.jsx";
import { useAuth } from "./context/AuthContext.jsx";

export default function App() {
  const { count } = useCart();
  const { user, isLoggedIn, isAdmin, logout } = useAuth();

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
          {isLoggedIn && <NavLink to="/library">Biblioteca</NavLink>}
          {isLoggedIn && <NavLink to="/wishlist">Desejos</NavLink>}
          {isLoggedIn && <NavLink to="/orders">Pedidos</NavLink>}
          {isLoggedIn && <NavLink to="/profile">Perfil</NavLink>}
          {isAdmin && <NavLink to="/admin/games">Painel</NavLink>}
        </nav>
        <div className="auth-area">
          {isLoggedIn ? (
            <>
              <span className="user-chip">{user.name} • {user.role}</span>
              <button className="button secondary compact" onClick={logout}>Sair</button>
            </>
          ) : (
            <>
              <NavLink to="/login">Login</NavLink>
              <NavLink to="/register" className="button compact">Criar conta</NavLink>
            </>
          )}
        </div>
      </header>

      {isAdmin && (
        <div className="admin-bar">
          <NavLink to="/admin/games">Jogos</NavLink>
          <NavLink to="/admin/genres">Gêneros</NavLink>
          <NavLink to="/admin/platforms">Plataformas</NavLink>
          <NavLink to="/admin/promotions">Promoções</NavLink>
          <NavLink to="/admin/users">Usuários</NavLink>
          <NavLink to="/admin/rawg-import">RAWG</NavLink>
        </div>
      )}

      <main className="container">
        <Outlet />
      </main>
    </div>
  );
}
