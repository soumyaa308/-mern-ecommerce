import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import productService from "../../services/productService";

export const fetchProducts = createAsyncThunk("products/fetchAll", async (params, { rejectWithValue }) => {
  try {
    const res = await productService.getProducts(params);
    return res.data;
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

export const fetchFeaturedProducts = createAsyncThunk("products/fetchFeatured", async (_, { rejectWithValue }) => {
  try {
    const res = await productService.getFeatured();
    return res.data;
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

const productsSlice = createSlice({
  name: "products",
  initialState: {
    items: [],
    featured: [],
    pagination: null,
    status: "idle",
    featuredStatus: "idle",
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload.products;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      .addCase(fetchFeaturedProducts.pending, (state) => {
        state.featuredStatus = "loading";
      })
      .addCase(fetchFeaturedProducts.fulfilled, (state, action) => {
        state.featuredStatus = "succeeded";
        state.featured = action.payload.products;
      })
      .addCase(fetchFeaturedProducts.rejected, (state) => {
        state.featuredStatus = "failed";
      });
  },
});

export default productsSlice.reducer;