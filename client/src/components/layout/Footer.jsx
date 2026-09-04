import { useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

const Footer = () => {
  const [email, setEmail] = useState("");

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    toast.success("Subscribed! Watch your inbox for offers.");
    setEmail("");
  };

  return (
    <footer className="mt-20 border-t border-gray-100 bg-gray-50">
      <div className="container-app grid grid-cols-1 gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <h3 className="font-display text-lg font-bold text-brand-700">
            MERN<span className="text-accent-500">Shop</span>
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            Quality products, delivered fast, backed by a team that cares.
          </p>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold text-gray-900">Shop</h4>
          <ul className="space-y-2 text-sm text-gray-500">
            <li><Link to="/shop" className="transition-colors hover:text-brand-600">New Arrivals</Link></li>
            <li><Link to="/shop" className="transition-colors hover:text-brand-600">Best Sellers</Link></li>
            <li><Link to="/shop" className="transition-colors hover:text-brand-600">Categories</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold text-gray-900">Support</h4>
          <ul className="space-y-2 text-sm text-gray-500">
            <li><Link to="/contact" className="transition-colors hover:text-brand-600">Contact Us</Link></li>
            <li><Link to="/my-orders" className="transition-colors hover:text-brand-600">Order Tracking</Link></li>
            <li><Link to="/contact" className="transition-colors hover:text-brand-600">Returns</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold text-gray-900">Newsletter</h4>
          <p className="text-sm text-gray-500">Get updates on new drops and offers.</p>
          <form onSubmit={handleSubscribe} className="mt-3 flex gap-2">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
            <button type="submit" className="btn-primary !px-3 !py-2 !text-xs">
              Join
            </button>
          </form>
        </div>
      </div>
      <div className="border-t border-gray-100 py-4 text-center text-xs text-gray-400">
        (c) {new Date().getFullYear()} MERNShop. All rights reserved.
      </div>
    </footer>
  );
};

export default Footer;