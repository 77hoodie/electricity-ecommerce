import { NavLink, Outlet } from "react-router-dom";
import React from "react";

export default function App() {
  return (
    <div className="app">
      <header className="header">
        <NavLink to="/" className="logo">Electricity</NavLink>
        <nav>
          <NavLink to="/catalog">Catálogo</NavLink>
          <NavLink to="/cart">Carrinho</NavLink>
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
