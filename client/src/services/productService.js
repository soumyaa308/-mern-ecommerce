import api from "./api";

const productService = {
  getProducts: (params) => api.get("/products", { params }),
  getFeatured: () => api.get("/products/featured"),
  getProductBySlug: (slug) => api.get(`/products/${slug}`),
};

export default productService;