import api from "./api";

const orderService = {
  placeOrder: (data) => api.post("/orders", data),
  getMyOrders: () => api.get("/orders/my-orders"),
  getOrderById: (id) => api.get(`/orders/${id}`),
  cancelOrder: (id) => api.put(`/orders/${id}/cancel`),
};

export default orderService;