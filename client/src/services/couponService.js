import api from "./api";

const couponService = {
  applyCoupon: (code, subtotal) => api.post("/coupons/apply", { code, subtotal }),
  getCoupons: () => api.get("/coupons"),
  createCoupon: (data) => api.post("/coupons", data),
  updateCoupon: (id, data) => api.put(`/coupons/${id}`, data),
  deleteCoupon: (id) => api.delete(`/coupons/${id}`),
};

export default couponService;