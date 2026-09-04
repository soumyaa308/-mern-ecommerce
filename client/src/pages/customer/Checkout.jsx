import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { fetchAddresses, addAddress } from "../../features/addresses/addressesSlice";
import { placeOrder } from "../../features/orders/ordersSlice";
import couponService from "../../services/couponService";
import paymentService from "../../services/paymentService";
import { loadRazorpayScript } from "../../utils/loadRazorpayScript";
import { formatINR } from "../../utils/formatCurrency";

const emptyForm = {
  fullName: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "India",
};

const NAME_REGEX = /^[A-Za-z\s.'-]+$/;
const PHONE_REGEX = /^(?:\+91)?[6-9]\d{9}$/;
const PINCODE_REGEX = /^[1-9][0-9]{5}$/;

const validateAddressForm = (form) => {
  const errors = {};
  if (!form.fullName.trim()) errors.fullName = "Full name is required";
  else if (!NAME_REGEX.test(form.fullName.trim())) errors.fullName = "Only letters allowed";

  if (!form.phone.trim()) errors.phone = "Phone number is required";
  else if (!PHONE_REGEX.test(form.phone.trim())) errors.phone = "Enter a valid 10-digit mobile number";

  if (!form.addressLine1.trim()) errors.addressLine1 = "Address line 1 is required";

  if (!form.city.trim()) errors.city = "City is required";
  else if (!NAME_REGEX.test(form.city.trim())) errors.city = "Only letters allowed";

  if (!form.state.trim()) errors.state = "State is required";
  else if (!NAME_REGEX.test(form.state.trim())) errors.state = "Only letters allowed";

  if (!form.postalCode.trim()) errors.postalCode = "Postal code is required";
  else if (!PINCODE_REGEX.test(form.postalCode.trim())) errors.postalCode = "Enter a valid 6-digit PIN code";

  if (!form.country.trim()) errors.country = "Country is required";

  return errors;
};

const Checkout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { cart } = useSelector((state) => state.cart);
  const { user } = useSelector((state) => state.auth);
  const { items: addresses, status: addressStatus } = useSelector((state) => state.addresses);
  const { status: orderStatus } = useSelector((state) => state.orders);

  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);

  const cartItems = cart?.items || [];
  const subtotal = cartItems.reduce((sum, item) => {
    const price = item.product?.discountPrice || item.product?.price || 0;
    return sum + price * item.quantity;
  }, 0);
  const shipping = subtotal >= 999 ? 0 : 79;
  const tax = Math.round(subtotal * 0.18);
  const discount = appliedCoupon?.discount || 0;
  const total = subtotal + shipping + tax - discount;

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    setCouponLoading(true);
    try {
      const res = await couponService.applyCoupon(couponInput.trim(), subtotal);
      setAppliedCoupon(res.data);
      toast.success(`Coupon applied ? you saved ${formatINR(res.data.discount)}`);
    } catch (err) {
      toast.error(err.message || "Invalid coupon");
      setAppliedCoupon(null);
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput("");
  };

  useEffect(() => {
    dispatch(fetchAddresses());
  }, [dispatch]);

  useEffect(() => {
    if (addresses.length > 0 && !selectedAddressId) {
      const defaultAddr = addresses.find((a) => a.isDefault) || addresses[0];
      setSelectedAddressId(defaultAddr._id);
    }
    if (addressStatus === "succeeded" && addresses.length === 0) {
      setShowForm(true);
    }
  }, [addresses, addressStatus, selectedAddressId]);

  const handleFormChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (formErrors[e.target.name]) {
      setFormErrors({ ...formErrors, [e.target.name]: undefined });
    }
  };

  const handleSaveAddress = async (e) => {
    e.preventDefault();

    const errors = validateAddressForm(form);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error("Please fix the highlighted fields");
      return;
    }

    const result = await dispatch(addAddress(form));
    if (addAddress.fulfilled.match(result)) {
      toast.success("Address saved");
      setSelectedAddressId(result.payload._id);
      setShowForm(false);
      setForm(emptyForm);
      setFormErrors({});
    } else {
      toast.error(result.payload || "Could not save address");
    }
  };

  // Places the order after payment is either not needed (COD) or has
  // already been verified (Razorpay success handler calls this with
  // paymentDetails attached).
  const finalizeOrder = async (paymentDetails) => {
    const result = await dispatch(
      placeOrder({
        addressId: selectedAddressId,
        paymentMethod,
        couponCode: appliedCoupon?.code,
        paymentDetails,
      })
    );
    if (placeOrder.fulfilled.match(result)) {
      navigate(`/order-success/${result.payload._id}`);
    } else {
      toast.error(result.payload || "Could not place order");
    }
  };

  const handleRazorpayPayment = async () => {
    setProcessingPayment(true);
    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        toast.error("Could not load payment gateway. Check your connection and try again.");
        return;
      }

      const res = await paymentService.createPaymentOrder(appliedCoupon?.code);
      const { razorpayOrderId, amount, currency, keyId } = res.data;

      const options = {
        key: keyId,
        amount,
        currency,
        name: "MERNShop",
        description: "Order Payment",
        order_id: razorpayOrderId,
        prefill: {
          name: user?.name,
          email: user?.email,
        },
        theme: { color: "#2c6f5d" },
        handler: async (response) => {
          // response contains razorpay_order_id, razorpay_payment_id, razorpay_signature
          await finalizeOrder(response);
        },
        modal: {
          ondismiss: () => {
            setProcessingPayment(false);
            toast.error("Payment cancelled");
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", () => {
        toast.error("Payment failed. Please try again.");
        setProcessingPayment(false);
      });
      rzp.open();
    } catch (err) {
      toast.error(err.message || "Could not start payment");
      setProcessingPayment(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddressId) {
      toast.error("Please select or add a shipping address");
      return;
    }

    if (paymentMethod === "razorpay") {
      await handleRazorpayPayment();
    } else {
      await finalizeOrder();
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="container-app py-24 text-center text-gray-400">
        Your cart is empty ? nothing to check out.
      </div>
    );
  }

  return (
    <div className="container-app py-10">
      <h1 className="text-2xl font-bold">Checkout</h1>

      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Shipping Address</h2>
              <button onClick={() => setShowForm(!showForm)} className="text-sm text-brand-600 hover:underline">
                {showForm ? "Cancel" : "+ Add new address"}
              </button>
            </div>

            {addresses.length > 0 && !showForm && (
              <div className="mt-4 space-y-3">
                {addresses.map((addr) => (
                  <label
                    key={addr._id}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm ${
                      selectedAddressId === addr._id ? "border-brand-500 bg-brand-50" : "border-gray-200"
                    }`}
                  >
                    <input
                      type="radio"
                      name="address"
                      checked={selectedAddressId === addr._id}
                      onChange={() => setSelectedAddressId(addr._id)}
                      className="mt-1"
                    />
                    <div>
                      <p className="font-medium">
                        {addr.fullName} ? {addr.phone}
                      </p>
                      <p className="text-gray-500">
                        {addr.addressLine1}, {addr.addressLine2 && `${addr.addressLine2}, `}
                        {addr.city}, {addr.state} {addr.postalCode}, {addr.country}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}

            {showForm && (
              <form onSubmit={handleSaveAddress} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2" noValidate>
                <div className="sm:col-span-2">
                  <input
                    name="fullName"
                    placeholder="Full name"
                    value={form.fullName}
                    onChange={handleFormChange}
                    className={`w-full rounded-lg border px-3 py-2 text-sm ${formErrors.fullName ? "border-red-400" : "border-gray-300"}`}
                  />
                  {formErrors.fullName && <p className="mt-1 text-xs text-red-500">{formErrors.fullName}</p>}
                </div>
                <div className="sm:col-span-2">
                  <input
                    name="phone"
                    placeholder="Phone number (10 digits)"
                    value={form.phone}
                    onChange={handleFormChange}
                    className={`w-full rounded-lg border px-3 py-2 text-sm ${formErrors.phone ? "border-red-400" : "border-gray-300"}`}
                  />
                  {formErrors.phone && <p className="mt-1 text-xs text-red-500">{formErrors.phone}</p>}
                </div>
                <div className="sm:col-span-2">
                  <input
                    name="addressLine1"
                    placeholder="Address line 1"
                    value={form.addressLine1}
                    onChange={handleFormChange}
                    className={`w-full rounded-lg border px-3 py-2 text-sm ${formErrors.addressLine1 ? "border-red-400" : "border-gray-300"}`}
                  />
                  {formErrors.addressLine1 && <p className="mt-1 text-xs text-red-500">{formErrors.addressLine1}</p>}
                </div>
                <input
                  name="addressLine2"
                  placeholder="Address line 2 (optional)"
                  value={form.addressLine2}
                  onChange={handleFormChange}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm sm:col-span-2"
                />
                <div>
                  <input
                    name="city"
                    placeholder="City"
                    value={form.city}
                    onChange={handleFormChange}
                    className={`w-full rounded-lg border px-3 py-2 text-sm ${formErrors.city ? "border-red-400" : "border-gray-300"}`}
                  />
                  {formErrors.city && <p className="mt-1 text-xs text-red-500">{formErrors.city}</p>}
                </div>
                <div>
                  <input
                    name="state"
                    placeholder="State"
                    value={form.state}
                    onChange={handleFormChange}
                    className={`w-full rounded-lg border px-3 py-2 text-sm ${formErrors.state ? "border-red-400" : "border-gray-300"}`}
                  />
                  {formErrors.state && <p className="mt-1 text-xs text-red-500">{formErrors.state}</p>}
                </div>
                <div>
                  <input
                    name="postalCode"
                    placeholder="PIN code (6 digits)"
                    value={form.postalCode}
                    onChange={handleFormChange}
                    className={`w-full rounded-lg border px-3 py-2 text-sm ${formErrors.postalCode ? "border-red-400" : "border-gray-300"}`}
                  />
                  {formErrors.postalCode && <p className="mt-1 text-xs text-red-500">{formErrors.postalCode}</p>}
                </div>
                <div>
                  <input
                    name="country"
                    placeholder="Country"
                    value={form.country}
                    onChange={handleFormChange}
                    className={`w-full rounded-lg border px-3 py-2 text-sm ${formErrors.country ? "border-red-400" : "border-gray-300"}`}
                  />
                  {formErrors.country && <p className="mt-1 text-xs text-red-500">{formErrors.country}</p>}
                </div>
                <button type="submit" className="btn-primary sm:col-span-2">
                  Save Address
                </button>
              </form>
            )}
          </div>

          <div className="card p-6">
            <h2 className="font-semibold">Payment Method</h2>
            <div className="mt-4 space-y-2 text-sm">
              <label className="flex items-center gap-2">
                <input type="radio" checked={paymentMethod === "cod"} onChange={() => setPaymentMethod("cod")} />
                Cash on Delivery
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={paymentMethod === "razorpay"}
                  onChange={() => setPaymentMethod("razorpay")}
                />
                Card / UPI / Netbanking (Razorpay)
              </label>
            </div>
          </div>
        </div>

        <div className="card h-fit p-6">
          <h2 className="font-semibold">Order Summary</h2>

          <div className="mt-4">
            {appliedCoupon ? (
              <div className="flex items-center justify-between rounded-lg bg-green-50 px-3 py-2 text-sm">
                <span className="font-medium text-green-700">{appliedCoupon.code} applied</span>
                <button onClick={handleRemoveCoupon} className="text-xs text-green-700 hover:underline">
                  Remove
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  placeholder="Coupon code"
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
                <button onClick={handleApplyCoupon} disabled={couponLoading} className="btn-secondary !px-4">
                  {couponLoading ? "..." : "Apply"}
                </button>
              </div>
            )}
          </div>

          <div className="mt-4 space-y-2 text-sm text-gray-500">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatINR(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span>-{formatINR(discount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Shipping</span>
              <span>{shipping === 0 ? "Free" : formatINR(shipping)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax (GST 18%)</span>
              <span>{formatINR(tax)}</span>
            </div>
          </div>
          <div className="mt-4 flex justify-between border-t border-gray-100 pt-4 font-semibold">
            <span>Total</span>
            <span>{formatINR(total)}</span>
          </div>
          <button
            onClick={handlePlaceOrder}
            disabled={orderStatus === "loading" || processingPayment}
            className="btn-primary mt-6 w-full"
          >
            {processingPayment
              ? "Opening payment..."
              : orderStatus === "loading"
              ? "Placing order..."
              : paymentMethod === "razorpay"
              ? `Pay ${formatINR(total)}`
              : "Place Order"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Checkout;