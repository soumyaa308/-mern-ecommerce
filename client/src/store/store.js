import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../features/auth/authSlice";
import productsReducer from "../features/products/productsSlice";
import cartReducer from "../features/cart/cartSlice";
import wishlistReducer from "../features/wishlist/wishlistSlice";
import addressesReducer from "../features/addresses/addressesSlice";
import ordersReducer from "../features/orders/ordersSlice";
import adminReducer from "../features/admin/adminSlice";

/**
 * Central Redux store.
 */
export const store = configureStore({
  reducer: {
    auth: authReducer,
    products: productsReducer,
    cart: cartReducer,
    wishlist: wishlistReducer,
    addresses: addressesReducer,
    orders: ordersReducer,
    admin: adminReducer,
  },
});

export default store;