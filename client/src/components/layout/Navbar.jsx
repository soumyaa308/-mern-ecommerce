import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { FiSearch, FiHeart, FiShoppingCart, FiUser, FiMenu, FiX } from "react-icons/fi";
import { logoutUser } from "../../features/auth/authSlice";
import { fetchCart, resetCartState } from "../../features/cart/cartSlice";
import { fetchWishlist, resetWishlistState } from "../../features/wishlist/wishlistSlice";

const Navbar = () => {
  const { user } = useSelector((state) => state.auth);
  const { cart } = useSelector((state) => state.cart);
  const { wishlist } = useSelector((state) => state.wishlist);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [searchInput, setSearchInput] = useState("");

  const cartCount = cart?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
  const wishlistCount = wishlist?.products?.length || 0;

  useEffect(() => {
    if (user) {
      dispatch(fetchCart());
      dispatch(fetchWishlist());
    } else {
      dispatch(resetCartState());
      dispatch(resetWishlistState());
    }
  }, [user, dispatch]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = async () => {
    await dispatch(logoutUser());
    dispatch(resetCartState());
    dispatch(resetWishlistState());
    toast.success("Logged out");
    navigate("/");
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    navigate(`/shop?search=${encodeURIComponent(searchInput.trim())}`);
    setSearchInput("");
    setMobileMenuOpen(false);
  };

  const navLinkClass = ({ isActive }) =>
    `text-sm font-medium transition-colors ${isActive ? "text-brand-700" : "text-gray-600 hover:text-brand-600"}`;

  return (
    <header
      className={`sticky top-0 z-40 border-b border-gray-100 bg-white/90 backdrop-blur transition-shadow ${
        scrolled ? "shadow-sm" : ""
      }`}
    >
      <div className="container-app flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-gray-600 hover:text-brand-600 md:hidden"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <FiX size={22} /> : <FiMenu size={22} />}
          </button>

          <Link to="/" className="font-display text-xl font-bold text-brand-700">
            MERN<span className="text-accent-500">Shop</span>
          </Link>

          <NavLink to="/shop" className={`hidden md:block ${navLinkClass({ isActive: false })}`}>
            Shop
          </NavLink>
        </div>

        <form onSubmit={handleSearch} className="hidden flex-1 max-w-md items-center md:flex">
          <div className="flex w-full items-center gap-2 rounded-full border border-gray-200 px-4 py-2 transition-colors focus-within:border-brand-400">
            <FiSearch className="text-gray-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search products..."
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>
        </form>

        <nav className="flex items-center gap-4 text-gray-600">
          <Link to="/wishlist" className="relative hidden hover:text-brand-600 sm:block">
            <FiHeart size={20} />
            {wishlistCount > 0 && (
              <span className="absolute -right-2 -top-2 grid h-4 w-4 place-items-center rounded-full bg-accent-500 text-[10px] text-white">
                {wishlistCount}
              </span>
            )}
          </Link>
          <Link to="/cart" className="relative hover:text-brand-600">
            <FiShoppingCart size={20} />
            {cartCount > 0 && (
              <span className="absolute -right-2 -top-2 grid h-4 w-4 place-items-center rounded-full bg-accent-500 text-[10px] text-white">
                {cartCount}
              </span>
            )}
          </Link>

          {user ? (
            <div className="hidden items-center gap-3 sm:flex">
              <Link to="/my-orders" className="text-sm hover:text-brand-600">
                Orders
              </Link>
              <Link to="/profile" className="flex items-center gap-1.5 hover:text-brand-600">
                <FiUser size={20} />
                <span className="hidden text-sm font-medium lg:inline">{user.name}</span>
              </Link>
              <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-brand-600">
                Logout
              </button>
            </div>
          ) : (
            <Link to="/login" className="hidden hover:text-brand-600 sm:block">
              <FiUser size={20} />
            </Link>
          )}
        </nav>
      </div>

      {/* Mobile menu drawer */}
      {mobileMenuOpen && (
        <div className="animate-slideDown border-t border-gray-100 bg-white px-4 py-4 md:hidden">
          <form onSubmit={handleSearch} className="mb-4 flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2">
            <FiSearch className="text-gray-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search products..."
              className="w-full bg-transparent text-sm outline-none"
            />
          </form>

          <nav className="flex flex-col gap-3">
            <NavLink to="/shop" onClick={() => setMobileMenuOpen(false)} className={navLinkClass}>
              Shop
            </NavLink>
            <NavLink to="/wishlist" onClick={() => setMobileMenuOpen(false)} className={navLinkClass}>
              Wishlist {wishlistCount > 0 && `(${wishlistCount})`}
            </NavLink>
            <NavLink to="/contact" onClick={() => setMobileMenuOpen(false)} className={navLinkClass}>
              Contact Us
            </NavLink>

            {user ? (
              <>
                <NavLink to="/my-orders" onClick={() => setMobileMenuOpen(false)} className={navLinkClass}>
                  My Orders
                </NavLink>
                <NavLink to="/profile" onClick={() => setMobileMenuOpen(false)} className={navLinkClass}>
                  Profile ({user.name})
                </NavLink>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="text-left text-sm font-medium text-red-500"
                >
                  Logout
                </button>
              </>
            ) : (
              <NavLink to="/login" onClick={() => setMobileMenuOpen(false)} className={navLinkClass}>
                Login / Register
              </NavLink>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Navbar;