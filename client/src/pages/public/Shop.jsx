import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import { fetchProducts } from "../../features/products/productsSlice";
import ProductCard from "../../components/product/ProductCard";

const Shop = () => {
  const dispatch = useDispatch();
  const { items, status, error } = useSelector((state) => state.products);
  const [searchParams, setSearchParams] = useSearchParams();

  const search = searchParams.get("search") || "";
  const category = searchParams.get("category") || "";

  useEffect(() => {
    const params = {};
    if (search) params.search = search;
    if (category) params.category = category;
    dispatch(fetchProducts(params));
  }, [dispatch, search, category]);

  const clearSearch = () => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("search");
      return next;
    });
  };

  return (
    <div className="container-app py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{search ? `Results for "${search}"` : "Shop All Products"}</h1>
        {search && (
          <button onClick={clearSearch} className="text-sm text-brand-600 hover:underline">
            Clear search
          </button>
        )}
      </div>

      {status === "loading" && (
        <div className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      )}

      {status === "failed" && (
        <div className="mt-8 rounded-lg bg-red-50 p-4 text-sm text-red-600">
          Couldn&apos;t load products: {error}
        </div>
      )}

      {status === "succeeded" && items.length === 0 && (
        <div className="mt-16 text-center text-gray-400">
          {search ? `No products found for "${search}".` : "No products found."}
        </div>
      )}

      {status === "succeeded" && items.length > 0 && (
        <div className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Shop;