import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { api } from "../api.js";

const AuthContext = createContext(null);
const STORAGE_KEY = "electricity-user";

function readStoredUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);

  const saveUser = useCallback((nextUser) => {
    setUser(nextUser);
    if (nextUser) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const login = useCallback(async ({ email, password }) => {
    const loggedUser = await api.login({ email, password });
    saveUser(loggedUser);
    return loggedUser;
  }, [saveUser]);

  const register = useCallback(async ({ name, email, password }) => {
    const createdUser = await api.register({ name, email, password });
    saveUser(createdUser);
    return createdUser;
  }, [saveUser]);

  const updateProfile = useCallback(async (payload) => {
    const updatedUser = await api.updateProfile(payload);
    saveUser(updatedUser);
    return updatedUser;
  }, [saveUser]);

  const logout = useCallback(() => {
    saveUser(null);
  }, [saveUser]);

  const value = useMemo(() => ({
    user,
    isLoggedIn: Boolean(user),
    isAdmin: user?.role === "ADMIN",
    login,
    register,
    updateProfile,
    logout
  }), [user, login, register, updateProfile, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
