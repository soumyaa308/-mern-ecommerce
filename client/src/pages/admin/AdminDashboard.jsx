import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { FiUsers, FiBox, FiShoppingBag, FiDollarSign } from "react-icons/fi";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { fetchDashboardStats, fetchSalesAnalytics } from "../../features/admin/adminSlice";
import { formatINR } from "../../utils/formatCurrency";

const StatCard = ({ icon: Icon, label, value }) => (
  <div className="card flex items-center gap-4 p-5">
    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600">
      <Icon size={20} />
    </div>
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-xl font-semibold text-gray-900">{value}</p>
    </div>
  </div>
);

const statusColors = {
  Pending: "bg-yellow-100 text-yellow-700",
  Confirmed: "bg-blue-100 text-blue-700",
  Processing: "bg-blue-100 text-blue-700",
  Shipped: "bg-indigo-100 text-indigo-700",
  "Out for Delivery": "bg-indigo-100 text-indigo-700",
  Delivered: "bg-green-100 text-green-700",
  Cancelled: "bg-red-100 text-red-700",
};

const AdminDashboard = () => {
  const dispatch = useDispatch();
  const { stats, salesData } = useSelector((state) => state.admin);

  useEffect(() => {
    dispatch(fetchDashboardStats());
    dispatch(fetchSalesAnalytics(30));
  }, [dispatch]);

  const chartData = salesData.map((d) => ({ date: d._id.slice(5), revenue: d.revenue }));

  return (
    <div>
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={FiUsers} label="Total Users" value={stats?.totalUsers ?? "?"} />
        <StatCard icon={FiBox} label="Total Products" value={stats?.totalProducts ?? "?"} />
        <StatCard icon={FiShoppingBag} label="Total Orders" value={stats?.totalOrders ?? "?"} />
        <StatCard icon={FiDollarSign} label="Total Revenue" value={stats ? formatINR(stats.totalRevenue) : "?"} />
      </div>

      <div className="card mt-6 p-6">
        <h2 className="font-semibold">Revenue ? Last 30 Days</h2>
        <div className="mt-4 h-64">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value) => formatINR(value)} />
                <Line type="monotone" dataKey="revenue" stroke="#2c6f5d" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="flex h-full items-center justify-center text-sm text-gray-400">
              No sales data yet for this period.
            </p>
          )}
        </div>
      </div>

      <div className="card mt-6 p-6">
        <h2 className="font-semibold">Recent Orders</h2>
        <div className="mt-4 space-y-2">
          {stats?.recentOrders?.length > 0 ? (
            stats.recentOrders.map((order) => (
              <Link
                key={order._id}
                to={`/admin/orders/${order._id}`}
                className="flex items-center justify-between rounded-lg border border-gray-100 p-3 text-sm hover:bg-gray-50"
              >
                <div>
                  <p className="font-medium">{order.user?.name}</p>
                  <p className="text-xs text-gray-400">{order.user?.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold">{formatINR(order.total)}</span>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusColors[order.orderStatus]}`}>
                    {order.orderStatus}
                  </span>
                </div>
              </Link>
            ))
          ) : (
            <p className="text-sm text-gray-400">No orders yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;