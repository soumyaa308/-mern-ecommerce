import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { fetchSalesAnalytics } from "../../features/admin/adminSlice";
import { formatINR } from "../../utils/formatCurrency";

const RANGE_OPTIONS = [
  { label: "7 days", value: 7 },
  { label: "30 days", value: 30 },
  { label: "90 days", value: 90 },
];

const AdminAnalytics = () => {
  const dispatch = useDispatch();
  const { salesData } = useSelector((state) => state.admin);
  const [range, setRange] = useState(30);

  useEffect(() => {
    dispatch(fetchSalesAnalytics(range));
  }, [dispatch, range]);

  const chartData = salesData.map((d) => ({ date: d._id.slice(5), revenue: d.revenue, orders: d.orders }));
  const totalRevenue = salesData.reduce((sum, d) => sum + d.revenue, 0);
  const totalOrders = salesData.reduce((sum, d) => sum + d.orders, 0);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Sales Analytics</h1>
        <div className="flex gap-2">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setRange(opt.value)}
              className={`rounded-lg px-3 py-1.5 text-sm ${
                range === opt.value ? "bg-brand-600 text-white" : "bg-white text-gray-600 border border-gray-200"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="card p-5">
          <p className="text-xs text-gray-400">Total Revenue ({range} days)</p>
          <p className="mt-1 text-2xl font-semibold">{formatINR(totalRevenue)}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs text-gray-400">Total Orders ({range} days)</p>
          <p className="mt-1 text-2xl font-semibold">{totalOrders}</p>
        </div>
      </div>

      <div className="card mt-6 p-6">
        <h2 className="font-semibold">Revenue by Day</h2>
        <div className="mt-4 h-72">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value) => formatINR(value)} />
                <Bar dataKey="revenue" fill="#2c6f5d" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="flex h-full items-center justify-center text-sm text-gray-400">
              No sales data for this period.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminAnalytics;