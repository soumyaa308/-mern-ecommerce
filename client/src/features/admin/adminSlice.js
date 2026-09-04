import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import adminService from "../../services/adminService";

export const fetchDashboardStats = createAsyncThunk("admin/fetchStats", async (_, { rejectWithValue }) => {
  try {
    const res = await adminService.getStats();
    return res.data;
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

export const fetchSalesAnalytics = createAsyncThunk("admin/fetchSales", async (days, { rejectWithValue }) => {
  try {
    const res = await adminService.getSalesAnalytics(days);
    return res.data.sales;
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

export const fetchAllProducts = createAsyncThunk("admin/fetchProducts", async (params, { rejectWithValue }) => {
  try {
    const res = await adminService.getAllProducts(params);
    return res.data.products;
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

export const deleteProduct = createAsyncThunk("admin/deleteProduct", async (id, { rejectWithValue }) => {
  try {
    await adminService.deleteProduct(id);
    return id;
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

export const fetchAllUsers = createAsyncThunk("admin/fetchUsers", async (_, { rejectWithValue }) => {
  try {
    const res = await adminService.getAllUsers();
    return res.data.users;
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

export const updateUserRole = createAsyncThunk("admin/updateUserRole", async ({ id, role }, { rejectWithValue }) => {
  try {
    const res = await adminService.updateUserRole(id, role);
    return res.data.user;
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

export const updateUserStatus = createAsyncThunk(
  "admin/updateUserStatus",
  async ({ id, isActive }, { rejectWithValue }) => {
    try {
      const res = await adminService.updateUserStatus(id, isActive);
      return res.data.user;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const fetchAllOrders = createAsyncThunk("admin/fetchOrders", async (_, { rejectWithValue }) => {
  try {
    const res = await adminService.getAllOrders();
    return res.data.orders;
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

export const updateOrderStatus = createAsyncThunk(
  "admin/updateOrderStatus",
  async ({ id, status }, { rejectWithValue }) => {
    try {
      const res = await adminService.updateOrderStatus(id, status);
      return res.data.order;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

const adminSlice = createSlice({
  name: "admin",
  initialState: {
    stats: null,
    salesData: [],
    products: [],
    users: [],
    orders: [],
    status: "idle",
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboardStats.fulfilled, (state, action) => {
        state.stats = action.payload;
      })
      .addCase(fetchSalesAnalytics.fulfilled, (state, action) => {
        state.salesData = action.payload;
      })
      .addCase(fetchAllProducts.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchAllProducts.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.products = action.payload;
      })
      .addCase(deleteProduct.fulfilled, (state, action) => {
        state.products = state.products.filter((p) => p._id !== action.payload);
      })
      .addCase(fetchAllUsers.fulfilled, (state, action) => {
        state.users = action.payload;
      })
      .addCase(updateUserRole.fulfilled, (state, action) => {
        state.users = state.users.map((u) => (u._id === action.payload._id ? action.payload : u));
      })
      .addCase(updateUserStatus.fulfilled, (state, action) => {
        state.users = state.users.map((u) => (u._id === action.payload._id ? action.payload : u));
      })
      .addCase(fetchAllOrders.fulfilled, (state, action) => {
        state.orders = action.payload;
      })
      .addCase(updateOrderStatus.fulfilled, (state, action) => {
        state.orders = state.orders.map((o) => (o._id === action.payload._id ? action.payload : o));
      });
  },
});

export default adminSlice.reducer;