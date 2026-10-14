const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3333/api";
const USER_STORAGE_KEY = "electricity-user";
const GUEST_CART_STORAGE_KEY = "electricity-guest-cart-id";

function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getGuestCartId() {
  let id = localStorage.getItem(GUEST_CART_STORAGE_KEY);
  if (!id) {
    id = `guest-${crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`}`;
    localStorage.setItem(GUEST_CART_STORAGE_KEY, id);
  }
  return id;
}

async function request(path, options = {}) {
  const user = getStoredUser();

  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      "X-Guest-Cart-Id": getGuestCartId(),
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
  updateProfile: (payload) => request("/auth/me", { method: "PUT", body: JSON.stringify(payload) }),

  listUsers: () => request("/users"),
  updateUser: (id, payload) => request(`/users/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteUser: (id) => request(`/users/${id}`, { method: "DELETE" }),

  listGames: (params = {}) => {
    const search = new URLSearchParams(params).toString();
    return request(`/games${search ? `?${search}` : ""}`);
  },
  getGame: (id) => request(`/games/${id}`),
  createGame: (game) => request("/games", { method: "POST", body: JSON.stringify(game) }),
  updateGame: (id, game) => request(`/games/${id}`, { method: "PUT", body: JSON.stringify(game) }),
  deleteGame: (id) => request(`/games/${id}`, { method: "DELETE" }),

  listGenres: () => request("/genres"),
  createGenre: (genre) => request("/genres", { method: "POST", body: JSON.stringify(genre) }),
  updateGenre: (id, genre) => request(`/genres/${id}`, { method: "PUT", body: JSON.stringify(genre) }),
  deleteGenre: (id) => request(`/genres/${id}`, { method: "DELETE" }),

  listPlatforms: () => request("/platforms"),
  createPlatform: (platform) => request("/platforms", { method: "POST", body: JSON.stringify(platform) }),
  updatePlatform: (id, platform) => request(`/platforms/${id}`, { method: "PUT", body: JSON.stringify(platform) }),
  deletePlatform: (id) => request(`/platforms/${id}`, { method: "DELETE" }),

  listPromotions: () => request("/promotions"),
  createPromotion: (promotion) => request("/promotions", { method: "POST", body: JSON.stringify(promotion) }),
  updatePromotion: (id, promotion) => request(`/promotions/${id}`, { method: "PUT", body: JSON.stringify(promotion) }),
  deletePromotion: (id) => request(`/promotions/${id}`, { method: "DELETE" }),

  getCart: () => request("/cart"),
  addCartItem: (gameId) => request("/cart/items", { method: "POST", body: JSON.stringify({ gameId }) }),
  removeCartItem: (cartItemId) => request(`/cart/items/${cartItemId}`, { method: "DELETE" }),
  clearCart: () => request("/cart", { method: "DELETE" }),
  mergeGuestCart: () => request("/cart/merge-guest", { method: "POST" }),
  checkout: () => request("/orders/checkout", { method: "POST" }),
  listLibrary: () => request("/library"),
  listOrders: () => request("/orders"),
  updateOrderStatus: (id, status) => request(`/orders/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),

  listWishlist: () => request("/wishlist"),
  addWishlist: (gameId) => request(`/wishlist/${gameId}`, { method: "POST" }),
  removeWishlist: (gameId) => request(`/wishlist/${gameId}`, { method: "DELETE" }),

  searchRawg: (query) => request(`/rawg/search?query=${encodeURIComponent(query)}`),
  importRawg: (rawgId, price) =>
    request(`/rawg/import/${rawgId}`, {
      method: "POST",
      body: JSON.stringify({ price })
    })
};
