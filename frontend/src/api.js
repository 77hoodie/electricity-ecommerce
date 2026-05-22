const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3333/api";
const STORAGE_KEY = "electricity-user";

function getStoredUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function request(path, options = {}) {
  const user = getStoredUser();

  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(user?.id ? { "X-User-Id": String(user.id) } : {}),
      ...(options.headers || {})
    },
    ...options
  });

  if (!response.ok) {
    let message = "Erro na requisição";

    try {
      const data = await response.json();
      message = data.message || message;
    } catch {
      message = response.statusText;
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export const api = {
  health: () => request("/health"),

  register: (payload) => request("/auth/register", { method: "POST", body: JSON.stringify(payload) }),
  login: (payload) => request("/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  me: () => request("/auth/me"),

  listGames: () => request("/games"),
  getGame: (id) => request(`/games/${id}`),
  createGame: (game) => request("/games", { method: "POST", body: JSON.stringify(game) }),
  updateGame: (id, game) => request(`/games/${id}`, { method: "PUT", body: JSON.stringify(game) }),
  deleteGame: (id) => request(`/games/${id}`, { method: "DELETE" }),

  listGenres: () => request("/genres"),
  createGenre: (genre) => request("/genres", { method: "POST", body: JSON.stringify(genre) }),
  updateGenre: (id, genre) => request(`/genres/${id}`, { method: "PUT", body: JSON.stringify(genre) }),
  deleteGenre: (id) => request(`/genres/${id}`, { method: "DELETE" }),

  getCart: () => request("/cart"),
  addCartItem: (gameId) => request("/cart/items", { method: "POST", body: JSON.stringify({ gameId }) }),
  removeCartItem: (cartItemId) => request(`/cart/items/${cartItemId}`, { method: "DELETE" }),
  clearCart: () => request("/cart", { method: "DELETE" }),
  checkout: () => request("/orders/checkout", { method: "POST" }),
  listLibrary: () => request("/library"),
  listOrders: () => request("/orders"),

  searchRawg: (query) => request(`/rawg/search?query=${encodeURIComponent(query)}`),
  importRawg: (rawgId, price) =>
    request(`/rawg/import/${rawgId}`, {
      method: "POST",
      body: JSON.stringify({ price })
    })
};
