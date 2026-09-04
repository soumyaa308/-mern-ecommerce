import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import addressService from "../../services/addressService";

export const fetchAddresses = createAsyncThunk("addresses/fetch", async (_, { rejectWithValue }) => {
  try {
    const res = await addressService.getAddresses();
    return res.data.addresses;
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

export const addAddress = createAsyncThunk("addresses/add", async (data, { rejectWithValue }) => {
  try {
    const res = await addressService.createAddress(data);
    return res.data.address;
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

export const deleteAddress = createAsyncThunk("addresses/delete", async (id, { rejectWithValue }) => {
  try {
    await addressService.deleteAddress(id);
    return id;
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

const addressesSlice = createSlice({
  name: "addresses",
  initialState: {
    items: [],
    status: "idle",
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAddresses.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchAddresses.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload;
      })
      .addCase(fetchAddresses.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      .addCase(addAddress.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
      })
      .addCase(deleteAddress.fulfilled, (state, action) => {
        state.items = state.items.filter((a) => a._id !== action.payload);
      });
  },
});

export default addressesSlice.reducer;