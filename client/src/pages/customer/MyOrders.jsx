import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { fetchMyOrders } from "../../features/orders/ordersSlice";
import { formatINR } from "../../utils/formatCurrency";

const statusColors = {
  Pending: "bg-yellow-100 text-yellow-700",
  Confirmed: "bg-blue-100 text-blue-700",
  Processing: "bg-blue-100 text-blue-700",
  Shipped: "bg-indigo-100 text-indigo-700",
  "Out for Delivery": "bg-indigo-100 text-indigo-700",
  Delivered: "bg-green-100 text-green-700",
  Cancelled: "bg-red-100 text-red-700",
};

const MyOrders = () => {
  const dispatch = useDispatch();
  const { items, status } = useSelector((state) => state.orders);

  useEffect(() => {
    dispatch(fetchMyOrders());
  }, [dispatch]);

  if (status === "loading" && items.length === 0) {
    return <div className="container-app py-16 text-center text-gray-400">Loading orders...</div>;
  }

  if (items.length === 0) {
    return (
      <div className="container-app flex flex-col items-center justify-center py-24 text-center">
        <h1 className="text-2xl font-bold">No orders yet</h1>
        <p className="mt-2 text-gray-500">When you place an order, it'll show up here.</p>
        <Link to="/shop" className="btn-primary mt-6">
          Browse Products
        </Link>
      </div>
    );
  }

  return (
    <div className="container-app py-10">
      <h1 className="text-2xl font-bold">My Orders</h1>
      <div className="mt-8 space-y-4">
        {items.map((order) => (
          <Link key={order._id} to={`/my-orders/${order._id}`} className="card flex items-center justify-between p-5">
            <div>
              <p className="font-mono text-xs text-gray-400">{order._id}</p>
              <p className="mt-1 text-sm text-gray-500">
                {order.items.length} item{order.items.length > 1 ? "s" : ""} ? Placed{" "}
                {new Date(order.createdAt).toLocaleDateString("en-IN")}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-semibold">{formatINR(order.total)}</span>
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusColors[order.orderStatus]}`}>
                {order.orderStatus}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default MyOrders;