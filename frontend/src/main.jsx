import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App.jsx";
import Home from "./pages/Home.jsx";
import Catalog from "./pages/Catalog.jsx";
import GameDetails from "./pages/GameDetails.jsx";
import AdminRawgImport from "./pages/AdminRawgImport.jsx";
import AdminGames from "./pages/AdminGames.jsx";
import AdminGenres from "./pages/AdminGenres.jsx";
import AdminPlatforms from "./pages/AdminPlatforms.jsx";
import AdminPromotions from "./pages/AdminPromotions.jsx";
import AdminUsers from "./pages/AdminUsers.jsx";
import Cart from "./pages/Cart.jsx";
import Library from "./pages/Library.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Wishlist from "./pages/Wishlist.jsx";
import Orders from "./pages/Orders.jsx";
import Profile from "./pages/Profile.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { CartProvider } from "./context/CartContext.jsx";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<App />}>
              <Route index element={<Home />} />
              <Route path="catalog" element={<Catalog />} />
              <Route path="games/:id" element={<GameDetails />} />
              <Route path="cart" element={<Cart />} />
              <Route path="library" element={<Library />} />
              <Route path="wishlist" element={<Wishlist />} />
              <Route path="orders" element={<Orders />} />
              <Route path="profile" element={<Profile />} />
              <Route path="login" element={<Login />} />
              <Route path="register" element={<Register />} />
              <Route path="admin/games" element={<AdminGames />} />
              <Route path="admin/genres" element={<AdminGenres />} />
              <Route path="admin/platforms" element={<AdminPlatforms />} />
              <Route path="admin/promotions" element={<AdminPromotions />} />
              <Route path="admin/users" element={<AdminUsers />} />
              <Route path="admin/rawg-import" element={<AdminRawgImport />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  </React.StrictMode>
);
