const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3333/api";

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
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
  listGames: () => request("/games"),
  getGame: (id) => request(`/games/${id}`),
  createGame: (game) => request("/games", { method: "POST", body: JSON.stringify(game) }),
  deleteGame: (id) => request(`/games/${id}`, { method: "DELETE" }),
  searchRawg: (query) => request(`/rawg/search?query=${encodeURIComponent(query)}`),
  importRawg: (rawgId, price) =>
    request(`/rawg/import/${rawgId}`, {
      method: "POST",
      body: JSON.stringify({ price })
    })
};
