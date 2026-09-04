import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import productService from "../../services/productService";
import reviewService from "../../services/reviewService";
import { addToCart } from "../../features/cart/cartSlice";
import { formatINR } from "../../utils/formatCurrency";
import RatingStars from "../../components/product/RatingStars";

const ProductDetails = () => {
  const { slug } = useParams();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  const [product, setProduct] = useState(null);
  const [status, setStatus] = useState("loading");
  const [quantity, setQuantity] = useState(1);

  const [reviews, setReviews] = useState([]);
  const [distribution, setDistribution] = useState([]);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: "" });
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    setStatus("loading");
    productService
      .getProductBySlug(slug)
      .then((res) => {
        setProduct(res.data.product);
        setStatus("succeeded");
        return reviewService.getProductReviews(res.data.product._id);
      })
      .then((res) => {
        setReviews(res.data.reviews);
        setDistribution(res.data.distribution);
      })
      .catch(() => setStatus("failed"));
  }, [slug]);

  const handleAddToCart = async () => {
    const result = await dispatch(addToCart({ productId: product._id, quantity }));
    if (addToCart.fulfilled.match(result)) {
      toast.success(`${product.name} added to cart`);
    } else {
      toast.error(result.payload || "Please log in to add items to your cart");
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    setSubmittingReview(true);
    try {
      const res = await reviewService.createReview(product._id, reviewForm);
      setReviews([res.data.review, ...reviews]);
      setReviewForm({ rating: 5, comment: "" });
      toast.success("Review submitted");
      const refreshed = await reviewService.getProductReviews(product._id);
      setDistribution(refreshed.data.distribution);
    } catch (err) {
      toast.error(err.message || "Could not submit review");
    } finally {
      setSubmittingReview(false);
    }
  };

  if (status === "loading") {
    return <div className="container-app py-16 text-center text-gray-400">Loading...</div>;
  }
  if (status === "failed" || !product) {
    return <div className="container-app py-16 text-center text-gray-400">Product not found.</div>;
  }

  const displayPrice = product.discountPrice || product.price;
  const hasDiscount = product.discountPrice && product.discountPrice < product.price;
  const maxDistCount = Math.max(...distribution.map((d) => d.count), 1);

  return (
    <div className="container-app py-10">
      <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
        <div className="aspect-square overflow-hidden rounded-xl bg-gray-50">
          <img src={product.images?.[0]?.url} alt={product.name} className="h-full w-full object-cover" />
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-gray-400">{product.category}</p>
          <h1 className="mt-1 text-2xl font-bold">{product.name}</h1>

          <div className="mt-2 flex items-center gap-2">
            <RatingStars rating={product.rating} />
            <span className="text-sm text-gray-500">
              {product.rating?.toFixed(1) || "0.0"} ({product.numReviews} review{product.numReviews !== 1 ? "s" : ""})
            </span>
          </div>

          <div className="mt-3 flex items-baseline gap-3">
            <span className="text-2xl font-semibold">{formatINR(displayPrice)}</span>
            {hasDiscount && <span className="text-lg text-gray-400 line-through">{formatINR(product.price)}</span>}
          </div>
          <p className="mt-4 text-sm leading-relaxed text-gray-600">{product.description}</p>

          <p className="mt-4 text-sm text-gray-500">
            {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
          </p>

          <div className="mt-6 flex items-center gap-3">
            <div className="flex items-center rounded-lg border border-gray-300">
              <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="px-3 py-2 text-gray-500 hover:text-gray-900">
                -
              </button>
              <span className="w-10 text-center text-sm">{quantity}</span>
              <button onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))} className="px-3 py-2 text-gray-500 hover:text-gray-900">
                +
              </button>
            </div>
            <button onClick={handleAddToCart} disabled={product.stock === 0} className="btn-primary flex-1">
              Add to Cart
            </button>
          </div>
        </div>
      </div>

      {/* Reviews section */}
      <div className="mt-16 grid grid-cols-1 gap-10 md:grid-cols-3">
        <div>
          <h2 className="text-xl font-bold">Customer Reviews</h2>
          <div className="mt-4 flex items-center gap-3">
            <span className="text-3xl font-bold">{product.rating?.toFixed(1) || "0.0"}</span>
            <div>
              <RatingStars rating={product.rating} size={18} />
              <p className="text-xs text-gray-400">{product.numReviews} reviews</p>
            </div>
          </div>
          <div className="mt-4 space-y-1">
            {distribution.map((d) => (
              <div key={d.star} className="flex items-center gap-2 text-xs text-gray-500">
                <span className="w-8">{d.star}?</span>
                <div className="h-1.5 flex-1 rounded-full bg-gray-100">
                  <div
                    className="h-1.5 rounded-full bg-amber-400"
                    style={{ width: `${(d.count / maxDistCount) * 100}%` }}
                  />
                </div>
                <span className="w-6 text-right">{d.count}</span>
              </div>
            ))}
          </div>

          {user && (
            <form onSubmit={handleSubmitReview} className="card mt-6 space-y-3 p-4">
              <p className="text-sm font-medium">Write a review</p>
              <RatingStars
                rating={reviewForm.rating}
                interactive
                onChange={(rating) => setReviewForm({ ...reviewForm, rating })}
              />
              <textarea
                required
                rows={3}
                placeholder="Share your thoughts on this product..."
                value={reviewForm.comment}
                onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <button type="submit" disabled={submittingReview} className="btn-primary w-full !py-2 !text-sm">
                {submittingReview ? "Submitting..." : "Submit Review"}
              </button>
              <p className="text-xs text-gray-400">Only customers who purchased this product can review it.</p>
            </form>
          )}
        </div>

        <div className="space-y-4 md:col-span-2">
          {reviews.length === 0 && <p className="text-sm text-gray-400">No reviews yet. Be the first!</p>}
          {reviews.map((review) => (
            <div key={review._id} className="border-b border-gray-100 pb-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{review.user?.name}</p>
                <span className="text-xs text-gray-400">{new Date(review.createdAt).toLocaleDateString("en-IN")}</span>
              </div>
              <RatingStars rating={review.rating} size={14} />
              <p className="mt-2 text-sm text-gray-600">{review.comment}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProductDetails;