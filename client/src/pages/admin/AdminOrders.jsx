import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { fetchAllOrders, updateOrderStatus } from "../../features/admin/adminSlice";
import { formatINR } from "../../utils/formatCurrency";

const STATUSES = ["Pending", "Confirmed", "Processing", "Shipped", "Out for Delivery", "Delivered", "Cancelled"];

const statusColors = {
  Pending: "bg-yellow-100 text-yellow-700",
  Confirmed: "bg-blue-100 text-blue-700",
  Processing: "bg-blue-100 text-blue-700",
  Shipped: "bg-indigo-100 text-indigo-700",
  "Out for Delivery": "bg-indigo-100 text-indigo-700",
  Delivered: "bg-green-100 text-green-700",
  Cancelled: "bg-red-100 text-red-700",
};

const AdminOrders = () => {
  const dispatch = useDispatch();
  const { orders } = useSelector((state) => state.admin);

  useEffect(() => {
    dispatch(fetchAllOrders());
  }, [dispatch]);

  const handleStatusChange = (id, status) => {
    dispatch(updateOrderStatus({ id, status })).then((result) => {
      if (updateOrderStatus.fulfilled.match(result)) {
        toast.success("Order status updated");
      } else {
        toast.error(result.payload || "Could not update status");
      }
    });
  };

  return (
    <div>
      <h1 className="text-2xl font-bold">Orders</h1>

      <div className="card mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-100 text-left text-xs uppercase text-gray-400">
            <tr>
              <th className="p-4">Order</th>
              <th className="p-4">Customer</th>
              <th className="p-4">Total</th>
              <th className="p-4">Status</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order._id} className="border-b border-gray-50">
                <td className="p-4 font-mono text-xs text-gray-500">{order._id.slice(-8)}</td>
                <td className="p-4">
                  <p className="font-medium">{order.user?.name}</p>
                  <p className="text-xs text-gray-400">{order.user?.email}</p>
                </td>
                <td className="p-4 font-semibold">{formatINR(order.total)}</td>
                <td className="p-4">
                  <select
                    value={order.orderStatus}
                    onChange={(e) => handleStatusChange(order._id, e.target.value)}
                    className={`rounded-full border-0 px-2.5 py-1 text-xs font-medium ${statusColors[order.orderStatus]}`}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="p-4 text-right">
                  <Link to={`/admin/orders/${order._id}`} className="text-xs text-brand-600 hover:underline">
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminOrders;