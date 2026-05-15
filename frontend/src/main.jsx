import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App.jsx";
import Home from "./pages/Home.jsx";
import Catalog from "./pages/Catalog.jsx";
import GameDetails from "./pages/GameDetails.jsx";
import AdminRawgImport from "./pages/AdminRawgImport.jsx";
import AdminGames from "./pages/AdminGames.jsx";
import Cart from "./pages/Cart.jsx";
import Library from "./pages/Library.jsx";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />}>
          <Route index element={<Home />} />
          <Route path="catalog" element={<Catalog />} />
          <Route path="games/:id" element={<GameDetails />} />
          <Route path="cart" element={<Cart />} />
          <Route path="library" element={<Library />} />
          <Route path="admin/games" element={<AdminGames />} />
          <Route path="admin/rawg-import" element={<AdminRawgImport />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
