import api from "./api";

const paymentService = {
  createPaymentOrder: (couponCode) => api.post("/payments/create-order", { couponCode }),
};

export default paymentService;