import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../api.js";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [library, setLibrary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastError, setLastError] = useState("");

  const loadCart = useCallback(async () => {
    const data = await api.getCart();
    setItems(data.items || []);
    return data;
  }, []);

  const loadLibrary = useCallback(async () => {
    const data = await api.listLibrary();
    setLibrary(data || []);
    return data;
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setLastError("");
    try {
      await Promise.all([loadCart(), loadLibrary()]);
    } catch (error) {
      setLastError(error.message);
    } finally {
      setLoading(false);
    }
  }, [loadCart, loadLibrary]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addToCart = useCallback(async (game) => {
    setLastError("");
    try {
      await api.addCartItem(game.id);
      await loadCart();
      return { ok: true, message: "Jogo adicionado ao carrinho." };
    } catch (error) {
      setLastError(error.message);
      return { ok: false, message: error.message };
    }
  }, [loadCart]);

  const removeFromCart = useCallback(async (cartItemId) => {
    setLastError("");
    try {
      await api.removeCartItem(cartItemId);
      await loadCart();
      return { ok: true };
    } catch (error) {
      setLastError(error.message);
      return { ok: false, message: error.message };
    }
  }, [loadCart]);

  const clearCart = useCallback(async () => {
    setLastError("");
    try {
      await api.clearCart();
      await loadCart();
      return { ok: true };
    } catch (error) {
      setLastError(error.message);
      return { ok: false, message: error.message };
    }
  }, [loadCart]);

  const purchaseCart = useCallback(async () => {
    setLastError("");
    try {
      const order = await api.checkout();
      await Promise.all([loadCart(), loadLibrary()]);
      return { ok: true, order };
    } catch (error) {
      setLastError(error.message);
      return { ok: false, message: error.message };
    }
  }, [loadCart, loadLibrary]);

  const total = useMemo(() => items.reduce((sum, item) => sum + Number(item.price), 0), [items]);
  const count = items.length;

  return (
    <CartContext.Provider value={{
      items,
      addToCart,
      removeFromCart,
      clearCart,
      purchaseCart,
      library,
      total,
      count,
      loading,
      lastError,
      refresh
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
