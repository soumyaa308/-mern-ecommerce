import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import wishlistService from "../../services/wishlistService";

export const fetchWishlist = createAsyncThunk("wishlist/fetch", async (_, { rejectWithValue }) => {
  try {
    const res = await wishlistService.getWishlist();
    return res.data.wishlist;
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

export const addToWishlist = createAsyncThunk("wishlist/add", async (productId, { rejectWithValue }) => {
  try {
    const res = await wishlistService.addItem(productId);
    return res.data.wishlist;
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

export const removeFromWishlist = createAsyncThunk("wishlist/remove", async (productId, { rejectWithValue }) => {
  try {
    const res = await wishlistService.removeItem(productId);
    return res.data.wishlist;
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

const wishlistSlice = createSlice({
  name: "wishlist",
  initialState: {
    wishlist: { products: [] },
    status: "idle",
    error: null,
  },
  reducers: {
    resetWishlistState: (state) => {
      state.wishlist = { products: [] };
      state.status = "idle";
    },
  },
  extraReducers: (builder) => {
    const setWishlist = (state, action) => {
      state.status = "succeeded";
      state.wishlist = action.payload;
    };
    const setError = (state, action) => {
      state.status = "failed";
      state.error = action.payload;
    };

    builder
      .addCase(fetchWishlist.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchWishlist.fulfilled, setWishlist)
      .addCase(fetchWishlist.rejected, setError)
      .addCase(addToWishlist.fulfilled, setWishlist)
      .addCase(addToWishlist.rejected, setError)
      .addCase(removeFromWishlist.fulfilled, setWishlist)
      .addCase(removeFromWishlist.rejected, setError);
  },
});

export const { resetWishlistState } = wishlistSlice.actions;
export default wishlistSlice.reducer;