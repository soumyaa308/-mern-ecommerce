import api from "./api";

const cartService = {
  getCart: () => api.get("/cart"),
  addItem: (payload) => api.post("/cart/items", payload),
  updateItem: (itemId, quantity) => api.put(`/cart/items/${itemId}`, { quantity }),
  removeItem: (itemId) => api.delete(`/cart/items/${itemId}`),
  clearCart: () => api.delete("/cart"),
};

export default cartService;