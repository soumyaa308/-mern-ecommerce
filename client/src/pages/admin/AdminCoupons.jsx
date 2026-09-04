import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FiPlus, FiTrash2 } from "react-icons/fi";
import couponService from "../../services/couponService";
import { formatINR } from "../../utils/formatCurrency";

const emptyForm = {
  code: "",
  discountType: "percentage",
  discountValue: "",
  minOrderValue: "",
  maxDiscount: "",
  expiryDate: "",
  usageLimit: "",
};

const AdminCoupons = () => {
  const [coupons, setCoupons] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);

  const loadCoupons = () => {
    couponService
      .getCoupons()
      .then((res) => setCoupons(res.data.coupons))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await couponService.createCoupon({
        code: form.code,
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        minOrderValue: form.minOrderValue ? Number(form.minOrderValue) : 0,
        maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : null,
        expiryDate: form.expiryDate,
        usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
      });
      toast.success("Coupon created");
      setForm(emptyForm);
      setShowForm(false);
      loadCoupons();
    } catch (err) {
      toast.error(err.message || "Could not create coupon");
    }
  };

  const handleDelete = async (id, code) => {
    if (!window.confirm(`Delete coupon "${code}"?`)) return;
    try {
      await couponService.deleteCoupon(id);
      toast.success("Coupon deleted");
      loadCoupons();
    } catch (err) {
      toast.error(err.message || "Could not delete coupon");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Coupons</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          <FiPlus size={16} /> {showForm ? "Cancel" : "New Coupon"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card mt-6 grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Code</label>
            <input name="code" required value={form.code} onChange={handleChange} placeholder="SAVE20" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm uppercase" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Discount Type</label>
            <select name="discountType" value={form.discountType} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
              <option value="percentage">Percentage (%)</option>
              <option value="fixed">Fixed Amount (?)</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Discount Value</label>
            <input type="number" name="discountValue" required min="0" value={form.discountValue} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Min Order Value (optional)</label>
            <input type="number" name="minOrderValue" min="0" value={form.minOrderValue} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Max Discount Cap (optional, for %)</label>
            <input type="number" name="maxDiscount" min="0" value={form.maxDiscount} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Usage Limit (optional)</label>
            <input type="number" name="usageLimit" min="1" value={form.usageLimit} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">Expiry Date</label>
            <input type="date" name="expiryDate" required value={form.expiryDate} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <button type="submit" className="btn-primary sm:col-span-2">
            Create Coupon
          </button>
        </form>
      )}

      <div className="card mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-100 text-left text-xs uppercase text-gray-400">
            <tr>
              <th className="p-4">Code</th>
              <th className="p-4">Discount</th>
              <th className="p-4">Min Order</th>
              <th className="p-4">Used</th>
              <th className="p-4">Expires</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-gray-400">Loading...</td>
              </tr>
            )}
            {!loading && coupons.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-gray-400">No coupons yet.</td>
              </tr>
            )}
            {coupons.map((c) => (
              <tr key={c._id} className="border-b border-gray-50">
                <td className="p-4 font-mono font-medium">{c.code}</td>
                <td className="p-4">
                  {c.discountType === "percentage" ? `${c.discountValue}%` : formatINR(c.discountValue)}
                </td>
                <td className="p-4">{c.minOrderValue ? formatINR(c.minOrderValue) : "?"}</td>
                <td className="p-4">
                  {c.usedCount} {c.usageLimit ? `/ ${c.usageLimit}` : ""}
                </td>
                <td className="p-4">{new Date(c.expiryDate).toLocaleDateString("en-IN")}</td>
                <td className="p-4 text-right">
                  <button onClick={() => handleDelete(c._id, c.code)} className="rounded-lg p-2 text-red-500 hover:bg-red-50">
                    <FiTrash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminCoupons;