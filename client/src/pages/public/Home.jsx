import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { fetchFeaturedProducts } from "../../features/products/productsSlice";
import productService from "../../services/productService";
import ProductCard from "../../components/product/ProductCard";

const ProductGrid = ({ status, items, emptyText }) => {
  if (status === "loading") {
    return (
      <div className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="aspect-[3/4] animate-pulse rounded-xl bg-gray-100" />
        ))}
      </div>
    );
  }
  if (status === "succeeded" && items.length === 0) {
    return <p className="mt-8 text-gray-400">{emptyText}</p>;
  }
  return (
    <div className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-4">
      {items.map((product) => (
        <ProductCard key={product._id} product={product} />
      ))}
    </div>
  );
};

const Home = () => {
  const dispatch = useDispatch();
  const { featured, featuredStatus } = useSelector((state) => state.products);

  const [newArrivals, setNewArrivals] = useState([]);
  const [newArrivalsStatus, setNewArrivalsStatus] = useState("loading");
  const [bestSellers, setBestSellers] = useState([]);
  const [bestSellersStatus, setBestSellersStatus] = useState("loading");

  useEffect(() => {
    dispatch(fetchFeaturedProducts());

    productService
      .getProducts({ sort: "newest", limit: 4 })
      .then((res) => {
        setNewArrivals(res.data.products);
        setNewArrivalsStatus("succeeded");
      })
      .catch(() => setNewArrivalsStatus("failed"));

    productService
      .getProducts({ sort: "popular", limit: 4 })
      .then((res) => {
        setBestSellers(res.data.products);
        setBestSellersStatus("succeeded");
      })
      .catch(() => setBestSellersStatus("failed"));
  }, [dispatch]);

  return (
    <div>
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-50 via-brand-50 to-accent-500/5 py-20 text-center">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-200/40 blur-3xl" />
        <div className="absolute -left-24 bottom-0 h-64 w-64 rounded-full bg-accent-500/10 blur-3xl" />
        <div className="container-app relative">
          <span className="inline-block rounded-full bg-white px-4 py-1.5 text-xs font-medium text-brand-700 shadow-sm">
            Free shipping on orders above ?999
          </span>
          <h1 className="mt-5 text-4xl font-bold sm:text-5xl">Shop Smarter with MERNShop</h1>
          <p className="mx-auto mt-3 max-w-xl text-gray-600">
            Quality products, fast delivery, and prices you&apos;ll love.
          </p>
          <Link to="/shop" className="btn-primary mt-6 inline-flex">
            Shop Now
          </Link>

          <div className="mx-auto mt-12 grid max-w-2xl grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-brand-700">8+</p>
              <p className="text-xs text-gray-500">Products</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-brand-700">4.6?</p>
              <p className="text-xs text-gray-500">Avg. Rating</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-brand-700">24/7</p>
              <p className="text-xs text-gray-500">Support</p>
            </div>
          </div>
        </div>
      </section>

      <section className="container-app py-14">
        <h2 className="text-2xl font-bold">Featured Products</h2>
        <ProductGrid
          status={featuredStatus}
          items={featured}
          emptyText="No featured products yet. Run the seed script on the server to add sample products."
        />
      </section>

      <section className="container-app py-14">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">New Arrivals</h2>
          <Link to="/shop" className="text-sm font-medium text-brand-600 hover:underline">
            View all ?
          </Link>
        </div>
        <ProductGrid status={newArrivalsStatus} items={newArrivals} emptyText="No products yet." />
      </section>

      <section className="container-app py-14">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Best Sellers</h2>
          <Link to="/shop" className="text-sm font-medium text-brand-600 hover:underline">
            View all ?
          </Link>
        </div>
        <ProductGrid status={bestSellersStatus} items={bestSellers} emptyText="No products yet." />
      </section>
    </div>
  );
};

export default Home;