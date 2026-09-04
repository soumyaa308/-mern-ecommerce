import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { fetchWishlist, removeFromWishlist } from "../../features/wishlist/wishlistSlice";
import { addToCart } from "../../features/cart/cartSlice";
import { formatINR } from "../../utils/formatCurrency";

const Wishlist = () => {
  const dispatch = useDispatch();
  const { wishlist, status } = useSelector((state) => state.wishlist);
  const products = wishlist?.products || [];

  useEffect(() => {
    dispatch(fetchWishlist());
  }, [dispatch]);

  const handleRemove = (productId) => {
    dispatch(removeFromWishlist(productId)).then((result) => {
      if (removeFromWishlist.fulfilled.match(result)) {
        toast.success("Removed from wishlist");
      }
    });
  };

  const handleAddToCart = (productId) => {
    dispatch(addToCart({ productId, quantity: 1 })).then((result) => {
      if (addToCart.fulfilled.match(result)) {
        toast.success("Added to cart");
      } else {
        toast.error(result.payload || "Could not add to cart");
      }
    });
  };

  if (status === "loading" && products.length === 0) {
    return <div className="container-app py-16 text-center text-gray-400">Loading wishlist...</div>;
  }

  if (products.length === 0) {
    return (
      <div className="container-app flex flex-col items-center justify-center py-24 text-center">
        <h1 className="text-2xl font-bold">Your wishlist is empty</h1>
        <p className="mt-2 text-gray-500">Save items you love to find them here later.</p>
        <Link to="/shop" className="btn-primary mt-6">
          Browse Products
        </Link>
      </div>
    );
  }

  return (
    <div className="container-app py-10">
      <h1 className="text-2xl font-bold">My Wishlist</h1>
      <div className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => (
          <div key={product._id} className="card overflow-hidden">
            <Link to={`/products/${product.slug}`} className="block aspect-square overflow-hidden bg-gray-50">
              <img src={product.images?.[0]?.url} alt={product.name} className="h-full w-full object-cover" />
            </Link>
            <div className="p-4">
              <h3 className="truncate font-medium text-gray-900">{product.name}</h3>
              <p className="mt-1 font-semibold">{formatINR(product.discountPrice || product.price)}</p>
              <div className="mt-3 flex gap-2">
                <button onClick={() => handleAddToCart(product._id)} className="btn-primary flex-1 !py-1.5 !text-xs">
                  Add to Cart
                </button>
                <button
                  onClick={() => handleRemove(product._id)}
                  className="btn-secondary !py-1.5 !text-xs"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Wishlist;