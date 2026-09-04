import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { FiCheck } from "react-icons/fi";
import { fetchOrderById, cancelOrder } from "../../features/orders/ordersSlice";
import { formatINR } from "../../utils/formatCurrency";

const TIMELINE_STEPS = ["Pending", "Confirmed", "Processing", "Shipped", "Out for Delivery", "Delivered"];
const CANCELLABLE = ["Pending", "Confirmed"];

const OrderDetails = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { currentOrder: order } = useSelector((state) => state.orders);

  useEffect(() => {
    dispatch(fetchOrderById(id));
  }, [dispatch, id]);

  const handleCancel = () => {
    dispatch(cancelOrder(id)).then((result) => {
      if (cancelOrder.fulfilled.match(result)) {
        toast.success("Order cancelled");
      } else {
        toast.error(result.payload || "Could not cancel order");
      }
    });
  };

  if (!order) {
    return <div className="container-app py-16 text-center text-gray-400">Loading order...</div>;
  }

  const isCancelled = order.orderStatus === "Cancelled";
  const currentStepIndex = TIMELINE_STEPS.indexOf(order.orderStatus);

  return (
    <div className="container-app py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Order Details</h1>
          <p className="mt-1 font-mono text-xs text-gray-400">{order._id}</p>
        </div>
        {CANCELLABLE.includes(order.orderStatus) && (
          <button onClick={handleCancel} className="btn-secondary !text-red-600">
            Cancel Order
          </button>
        )}
      </div>

      {/* Tracking timeline */}
      {!isCancelled ? (
        <div className="card mt-8 p-6">
          <div className="flex items-center justify-between">
            {TIMELINE_STEPS.map((step, i) => (
              <div key={step} className="flex flex-1 flex-col items-center text-center">
                <div className="flex w-full items-center">
                  <div
                    className={`h-0.5 flex-1 ${i === 0 ? "invisible" : i <= currentStepIndex ? "bg-brand-600" : "bg-gray-200"}`}
                  />
                  <div
                    className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs ${
                      i <= currentStepIndex ? "bg-brand-600 text-white" : "bg-gray-200 text-gray-400"
                    }`}
                  >
                    {i <= currentStepIndex ? <FiCheck size={14} /> : i + 1}
                  </div>
                  <div
                    className={`h-0.5 flex-1 ${i === TIMELINE_STEPS.length - 1 ? "invisible" : i < currentStepIndex ? "bg-brand-600" : "bg-gray-200"}`}
                  />
                </div>
                <span className="mt-2 text-[11px] text-gray-500">{step}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-8 rounded-lg bg-red-50 p-4 text-sm text-red-600">This order was cancelled.</div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {order.items.map((item, i) => (
            <div key={i} className="card flex items-center gap-4 p-4">
              <img src={item.image} alt={item.name} className="h-16 w-16 rounded-lg object-cover" />
              <div className="flex-1">
                <p className="font-medium">{item.name}</p>
                <p className="text-sm text-gray-500">
                  Qty {item.quantity} ? {formatINR(item.price)}
                </p>
              </div>
              <span className="font-semibold">{formatINR(item.price * item.quantity)}</span>
            </div>
          ))}
        </div>

        <div className="space-y-6">
          <div className="card p-5">
            <h3 className="text-sm font-semibold">Shipping Address</h3>
            <p className="mt-2 text-sm text-gray-500">
              {order.shippingAddress.fullName} ? {order.shippingAddress.phone}
              <br />
              {order.shippingAddress.addressLine1}, {order.shippingAddress.city}, {order.shippingAddress.state}{" "}
              {order.shippingAddress.postalCode}
            </p>
          </div>

          <div className="card p-5">
            <h3 className="text-sm font-semibold">Payment</h3>
            <div className="mt-2 space-y-1 text-sm text-gray-500">
              <div className="flex justify-between">
                <span>Method</span>
                <span className="uppercase">{order.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatINR(order.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping</span>
                <span>{order.shipping === 0 ? "Free" : formatINR(order.shipping)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax</span>
                <span>{formatINR(order.tax)}</span>
              </div>
              <div className="flex justify-between border-t border-gray-100 pt-2 font-semibold text-gray-900">
                <span>Total</span>
                <span>{formatINR(order.total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetails;