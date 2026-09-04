import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import orderService from "../../services/orderService";

export const placeOrder = createAsyncThunk("orders/place", async (data, { rejectWithValue }) => {
  try {
    const res = await orderService.placeOrder(data);
    return res.data.order;
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

export const fetchMyOrders = createAsyncThunk("orders/fetchMine", async (_, { rejectWithValue }) => {
  try {
    const res = await orderService.getMyOrders();
    return res.data.orders;
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

export const fetchOrderById = createAsyncThunk("orders/fetchOne", async (id, { rejectWithValue }) => {
  try {
    const res = await orderService.getOrderById(id);
    return res.data.order;
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

export const cancelOrder = createAsyncThunk("orders/cancel", async (id, { rejectWithValue }) => {
  try {
    const res = await orderService.cancelOrder(id);
    return res.data.order;
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

const ordersSlice = createSlice({
  name: "orders",
  initialState: {
    items: [],
    currentOrder: null,
    lastPlacedOrder: null,
    status: "idle",
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(placeOrder.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(placeOrder.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.lastPlacedOrder = action.payload;
      })
      .addCase(placeOrder.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      .addCase(fetchMyOrders.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchMyOrders.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload;
      })
      .addCase(fetchMyOrders.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      .addCase(fetchOrderById.fulfilled, (state, action) => {
        state.currentOrder = action.payload;
      })
      .addCase(cancelOrder.fulfilled, (state, action) => {
        state.currentOrder = action.payload;
        state.items = state.items.map((o) => (o._id === action.payload._id ? action.payload : o));
      });
  },
});

export default ordersSlice.reducer;