import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { FiShoppingCart, FiHeart } from "react-icons/fi";
import { addToCart } from "../../features/cart/cartSlice";
import { addToWishlist, removeFromWishlist } from "../../features/wishlist/wishlistSlice";
import { formatINR } from "../../utils/formatCurrency";

const ProductCard = ({ product }) => {
  const dispatch = useDispatch();
  const { wishlist } = useSelector((state) => state.wishlist);
  const isWishlisted = wishlist?.products?.some((p) => p._id === product._id);

  const handleAddToCart = async (e) => {
    e.preventDefault();
    const result = await dispatch(addToCart({ productId: product._id, quantity: 1 }));
    if (addToCart.fulfilled.match(result)) {
      toast.success(`${product.name} added to cart`);
    } else {
      toast.error(result.payload || "Please log in to add items to your cart");
    }
  };

  const handleToggleWishlist = async (e) => {
    e.preventDefault();
    const action = isWishlisted ? removeFromWishlist(product._id) : addToWishlist(product._id);
    const result = await dispatch(action);
    if (isWishlisted ? removeFromWishlist.fulfilled.match(result) : addToWishlist.fulfilled.match(result)) {
      toast.success(isWishlisted ? "Removed from wishlist" : "Added to wishlist");
    } else {
      toast.error(result.payload || "Please log in to use your wishlist");
    }
  };

  const displayPrice = product.discountPrice || product.price;
  const hasDiscount = product.discountPrice && product.discountPrice < product.price;

  return (
    <Link to={`/products/${product.slug}`} className="card group block overflow-hidden">
      <div className="relative aspect-square overflow-hidden bg-gray-50">
        <img
          src={product.images?.[0]?.url}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <button
          onClick={handleToggleWishlist}
          className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-white/90 shadow-sm transition-transform active:scale-90"
          aria-label="Toggle wishlist"
        >
          <FiHeart
            size={16}
            className={`transition-colors ${isWishlisted ? "fill-accent-500 text-accent-500" : "text-gray-500"}`}
          />
        </button>
      </div>
      <div className="p-4">
        <p className="text-xs uppercase tracking-wide text-gray-400">{product.category}</p>
        <h3 className="mt-1 truncate font-medium text-gray-900">{product.name}</h3>
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-gray-900">{formatINR(displayPrice)}</span>
            {hasDiscount && (
              <span className="text-sm text-gray-400 line-through">{formatINR(product.price)}</span>
            )}
          </div>
          <button
            onClick={handleAddToCart}
            className="rounded-full bg-brand-600 p-2 text-white transition-colors hover:bg-brand-700"
            aria-label="Add to cart"
          >
            <FiShoppingCart size={16} />
          </button>
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;