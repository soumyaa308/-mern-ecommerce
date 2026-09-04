import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { fetchCart, updateCartItem, removeFromCart } from "../../features/cart/cartSlice";
import { formatINR } from "../../utils/formatCurrency";

const Cart = () => {
  const dispatch = useDispatch();
  const { cart, status } = useSelector((state) => state.cart);
  const items = cart?.items || [];

  useEffect(() => {
    dispatch(fetchCart());
  }, [dispatch]);

  const handleQuantityChange = (itemId, quantity) => {
    if (quantity < 1) return;
    dispatch(updateCartItem({ itemId, quantity })).then((result) => {
      if (!updateCartItem.fulfilled.match(result)) {
        toast.error(result.payload || "Could not update quantity");
      }
    });
  };

  const handleRemove = (itemId) => {
    dispatch(removeFromCart(itemId)).then((result) => {
      if (removeFromCart.fulfilled.match(result)) {
        toast.success("Item removed");
      }
    });
  };

  const subtotal = items.reduce((sum, item) => {
    const price = item.product?.discountPrice || item.product?.price || 0;
    return sum + price * item.quantity;
  }, 0);

  if (status === "loading" && items.length === 0) {
    return <div className="container-app py-16 text-center text-gray-400">Loading cart...</div>;
  }

  if (items.length === 0) {
    return (
      <div className="container-app flex flex-col items-center justify-center py-24 text-center">
        <h1 className="text-2xl font-bold">Your cart is empty</h1>
        <p className="mt-2 text-gray-500">Looks like you haven&apos;t added anything yet.</p>
        <Link to="/shop" className="btn-primary mt-6">
          Browse Products
        </Link>
      </div>
    );
  }

  return (
    <div className="container-app py-10">
      <h1 className="text-2xl font-bold">Shopping Cart</h1>

      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {items.map((item) => {
            const price = item.product?.discountPrice || item.product?.price || 0;
            return (
              <div key={item._id} className="card flex items-center gap-4 p-4">
                <img
                  src={item.product?.images?.[0]?.url}
                  alt={item.product?.name}
                  className="h-20 w-20 rounded-lg object-cover"
                />
                <div className="flex-1">
                  <p className="font-medium">{item.product?.name}</p>
                  {(item.size || item.color) && (
                    <p className="text-xs text-gray-400">
                      {item.size && `Size: ${item.size}`} {item.color && `Color: ${item.color}`}
                    </p>
                  )}
                  <p className="mt-1 text-sm text-gray-500">{formatINR(price)}</p>
                </div>
                <div className="flex items-center rounded-lg border border-gray-300">
                  <button
                    onClick={() => handleQuantityChange(item._id, item.quantity - 1)}
                    className="px-3 py-1.5 text-gray-500 hover:text-gray-900"
                  >
                    -
                  </button>
                  <span className="w-8 text-center text-sm">{item.quantity}</span>
                  <button
                    onClick={() => handleQuantityChange(item._id, item.quantity + 1)}
                    className="px-3 py-1.5 text-gray-500 hover:text-gray-900"
                  >
                    +
                  </button>
                </div>
                <button onClick={() => handleRemove(item._id)} className="text-sm text-red-500 hover:underline">
                  Remove
                </button>
              </div>
            );
          })}
        </div>

        <div className="card h-fit p-6">
          <h2 className="font-semibold">Order Summary</h2>
          <div className="mt-4 flex justify-between text-sm text-gray-500">
            <span>Subtotal</span>
            <span>{formatINR(subtotal)}</span>
          </div>
          <div className="mt-2 flex justify-between text-sm text-gray-500">
            <span>Shipping</span>
            <span>Calculated at checkout</span>
          </div>
          <div className="mt-4 flex justify-between border-t border-gray-100 pt-4 font-semibold">
            <span>Total</span>
            <span>{formatINR(subtotal)}</span>
          </div>
          <Link to="/checkout" className="btn-primary mt-6 block w-full text-center">
            Proceed to Checkout
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Cart;