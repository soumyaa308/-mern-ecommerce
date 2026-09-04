import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import adminService from "../../services/adminService";
import { fetchAllProducts } from "../../features/admin/adminSlice";

const emptyForm = {
  name: "",
  description: "",
  price: "",
  discountPrice: "",
  category: "",
  brand: "",
  sku: "",
  stock: "",
  imageUrl: "",
  sizes: "",
  colors: "",
  isFeatured: false,
};

const AdminProductForm = () => {
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { products } = useSelector((state) => state.admin);

  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(isEditMode);

  useEffect(() => {
    if (!isEditMode) return;

    const existing = products.find((p) => p._id === id);
    if (existing) {
      setForm({
        name: existing.name,
        description: existing.description,
        price: existing.price,
        discountPrice: existing.discountPrice || "",
        category: existing.category,
        brand: existing.brand || "",
        sku: existing.sku || "",
        stock: existing.stock,
        imageUrl: existing.images?.[0]?.url || "",
        sizes: (existing.sizes || []).join(", "),
        colors: (existing.colors || []).join(", "),
        isFeatured: existing.isFeatured || false,
      });
      setLoading(false);
    } else {
      dispatch(fetchAllProducts()).then(() => setLoading(false));
    }
  }, [id, isEditMode, products, dispatch]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      name: form.name,
      description: form.description,
      price: Number(form.price),
      discountPrice: form.discountPrice ? Number(form.discountPrice) : null,
      category: form.category,
      brand: form.brand,
      sku: form.sku || undefined,
      stock: Number(form.stock),
      images: form.imageUrl ? [{ url: form.imageUrl }] : [],
      sizes: form.sizes ? form.sizes.split(",").map((s) => s.trim()).filter(Boolean) : [],
      colors: form.colors ? form.colors.split(",").map((c) => c.trim()).filter(Boolean) : [],
      isFeatured: form.isFeatured,
    };

    try {
      if (isEditMode) {
        await adminService.updateProduct(id, payload);
        toast.success("Product updated");
      } else {
        await adminService.createProduct(payload);
        toast.success("Product created");
      }
      dispatch(fetchAllProducts());
      navigate("/admin/products");
    } catch (err) {
      toast.error(err.message || "Could not save product");
    }
  };

  if (loading) {
    return <p className="text-gray-400">Loading product...</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">{isEditMode ? "Edit Product" : "Add Product"}</h1>

      <form onSubmit={handleSubmit} className="card mt-6 grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-gray-700">Name</label>
          <input name="name" required value={form.name} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
          <textarea name="description" required rows={3} value={form.description} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Price (INR)</label>
          <input type="number" name="price" required min="0" value={form.price} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Discount Price (optional)</label>
          <input type="number" name="discountPrice" min="0" value={form.discountPrice} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Category</label>
          <input name="category" required value={form.category} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="e.g. clothing" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Brand</label>
          <input name="brand" value={form.brand} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">SKU</label>
          <input name="sku" value={form.sku} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Stock</label>
          <input type="number" name="stock" required min="0" value={form.stock} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-gray-700">Image URL</label>
          <input name="imageUrl" required value={form.imageUrl} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="https://..." />
          <p className="mt-1 text-xs text-gray-400">
            Direct image upload requires Cloudinary credentials ? paste an image URL for now.
          </p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Sizes (comma-separated)</label>
          <input name="sizes" value={form.sizes} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="S, M, L, XL" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Colors (comma-separated)</label>
          <input name="colors" value={form.colors} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="Black, White" />
        </div>

        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" name="isFeatured" checked={form.isFeatured} onChange={handleChange} />
          Show on homepage as a featured product
        </label>

        <div className="flex gap-3 sm:col-span-2">
          <button type="submit" className="btn-primary">
            {isEditMode ? "Save Changes" : "Create Product"}
          </button>
          <button type="button" onClick={() => navigate("/admin/products")} className="btn-secondary">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminProductForm;