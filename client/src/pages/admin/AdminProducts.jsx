import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { FiPlus, FiEdit2, FiTrash2 } from "react-icons/fi";
import { fetchAllProducts, deleteProduct } from "../../features/admin/adminSlice";
import { formatINR } from "../../utils/formatCurrency";

const AdminProducts = () => {
  const dispatch = useDispatch();
  const { products, status } = useSelector((state) => state.admin);

  useEffect(() => {
    dispatch(fetchAllProducts());
  }, [dispatch]);

  const handleDelete = (id, name) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    dispatch(deleteProduct(id)).then((result) => {
      if (deleteProduct.fulfilled.match(result)) {
        toast.success("Product deleted");
      } else {
        toast.error(result.payload || "Could not delete product");
      }
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Products</h1>
        <Link to="/admin/products/new" className="btn-primary">
          <FiPlus size={16} /> Add Product
        </Link>
      </div>

      <div className="card mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-100 text-left text-xs uppercase text-gray-400">
            <tr>
              <th className="p-4">Product</th>
              <th className="p-4">Category</th>
              <th className="p-4">Price</th>
              <th className="p-4">Stock</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody>
            {status === "loading" && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-gray-400">
                  Loading...
                </td>
              </tr>
            )}
            {status === "succeeded" && products.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-gray-400">
                  No products yet.
                </td>
              </tr>
            )}
            {products.map((product) => (
              <tr key={product._id} className="border-b border-gray-50">
                <td className="flex items-center gap-3 p-4">
                  <img src={product.images?.[0]?.url} alt="" className="h-10 w-10 rounded-lg object-cover" />
                  <span className="font-medium">{product.name}</span>
                </td>
                <td className="p-4 capitalize text-gray-500">{product.category}</td>
                <td className="p-4">{formatINR(product.discountPrice || product.price)}</td>
                <td className="p-4">
                  <span className={product.stock === 0 ? "text-red-500" : "text-gray-700"}>{product.stock}</span>
                </td>
                <td className="p-4">
                  <div className="flex justify-end gap-2">
                    <Link to={`/admin/products/${product._id}/edit`} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100">
                      <FiEdit2 size={16} />
                    </Link>
                    <button
                      onClick={() => handleDelete(product._id, product.name)}
                      className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                    >
                      <FiTrash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminProducts;