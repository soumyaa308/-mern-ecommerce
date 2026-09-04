import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import orderService from "../../services/orderService";
import { formatINR } from "../../utils/formatCurrency";

const AdminOrderDetails = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);

  useEffect(() => {
    orderService.getOrderById(id).then((res) => setOrder(res.data.order));
  }, [id]);

  if (!order) {
    return <p className="text-gray-400">Loading order...</p>;
  }

  return (
    <div>
      <Link to="/admin/orders" className="text-sm text-brand-600 hover:underline">
        ? Back to Orders
      </Link>
      <h1 className="mt-2 text-2xl font-bold">Order {order._id.slice(-8)}</h1>
      <p className="mt-1 text-sm text-gray-500">
        Status: <span className="font-medium">{order.orderStatus}</span>
      </p>

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-3">
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
              <div className="flex justify-between font-semibold text-gray-900">
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

export default AdminOrderDetails;