import api from "./api";

const adminService = {
  getStats: () => api.get("/admin/stats"),
  getSalesAnalytics: (days = 30) => api.get(`/admin/analytics/sales?days=${days}`),
  getAllUsers: () => api.get("/admin/users"),
  updateUserRole: (id, role) => api.put(`/admin/users/${id}/role`, { role }),
  updateUserStatus: (id, isActive) => api.put(`/admin/users/${id}/status`, { isActive }),

  // Product management (reuses the main products API, admin-only endpoints)
  getAllProducts: (params) => api.get("/products", { params: { limit: 50, ...params } }),
  createProduct: (data) => api.post("/products", data),
  updateProduct: (id, data) => api.put(`/products/${id}`, data),
  deleteProduct: (id) => api.delete(`/products/${id}`),
  getCategories: () => api.get("/products/categories/list"),

  // Order management
  getAllOrders: () => api.get("/orders"),
  updateOrderStatus: (id, status) => api.put(`/orders/${id}/status`, { status }),
};

export default adminService;