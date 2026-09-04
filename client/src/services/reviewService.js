import api from "./api";

const reviewService = {
  getProductReviews: (productId) => api.get(`/reviews/product/${productId}`),
  createReview: (productId, data) => api.post(`/reviews/product/${productId}`, data),
  updateReview: (id, data) => api.put(`/reviews/${id}`, data),
  deleteReview: (id) => api.delete(`/reviews/${id}`),
};

export default reviewService;