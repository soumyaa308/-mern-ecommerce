import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import cartService from "../../services/cartService";

export const fetchCart = createAsyncThunk("cart/fetch", async (_, { rejectWithValue }) => {
  try {
    const res = await cartService.getCart();
    return res.data.cart;
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

export const addToCart = createAsyncThunk("cart/addItem", async (payload, { rejectWithValue }) => {
  try {
    const res = await cartService.addItem(payload);
    return res.data.cart;
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

export const updateCartItem = createAsyncThunk(
  "cart/updateItem",
  async ({ itemId, quantity }, { rejectWithValue }) => {
    try {
      const res = await cartService.updateItem(itemId, quantity);
      return res.data.cart;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const removeFromCart = createAsyncThunk("cart/removeItem", async (itemId, { rejectWithValue }) => {
  try {
    const res = await cartService.removeItem(itemId);
    return res.data.cart;
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

export const clearCart = createAsyncThunk("cart/clear", async (_, { rejectWithValue }) => {
  try {
    const res = await cartService.clearCart();
    return res.data.cart;
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

const cartSlice = createSlice({
  name: "cart",
  initialState: {
    cart: { items: [] },
    status: "idle",
    error: null,
  },
  reducers: {
    resetCartState: (state) => {
      state.cart = { items: [] };
      state.status = "idle";
    },
  },
  extraReducers: (builder) => {
    const setCart = (state, action) => {
      state.status = "succeeded";
      state.cart = action.payload;
    };
    const setError = (state, action) => {
      state.status = "failed";
      state.error = action.payload;
    };

    builder
      .addCase(fetchCart.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchCart.fulfilled, setCart)
      .addCase(fetchCart.rejected, setError)
      .addCase(addToCart.fulfilled, setCart)
      .addCase(addToCart.rejected, setError)
      .addCase(updateCartItem.fulfilled, setCart)
      .addCase(updateCartItem.rejected, setError)
      .addCase(removeFromCart.fulfilled, setCart)
      .addCase(removeFromCart.rejected, setError)
      .addCase(clearCart.fulfilled, setCart);
  },
});

export const { resetCartState } = cartSlice.actions;
export default cartSlice.reducer;