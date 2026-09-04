import { NavLink, Outlet, Link } from "react-router-dom";
import { FiGrid, FiBox, FiUsers, FiShoppingBag, FiBarChart2, FiTag, FiArrowLeft } from "react-icons/fi";

const navItems = [
  { to: "/admin", label: "Dashboard", icon: FiGrid, end: true },
  { to: "/admin/products", label: "Products", icon: FiBox },
  { to: "/admin/orders", label: "Orders", icon: FiShoppingBag },
  { to: "/admin/coupons", label: "Coupons", icon: FiTag },
  { to: "/admin/users", label: "Users", icon: FiUsers },
  { to: "/admin/analytics", label: "Analytics", icon: FiBarChart2 },
];

const AdminLayout = () => {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="w-60 shrink-0 border-r border-gray-100 bg-white">
        <div className="flex h-16 items-center border-b border-gray-100 px-6">
          <Link to="/" className="font-display text-lg font-bold text-brand-700">
            MERN<span className="text-accent-500">Shop</span>
          </Link>
        </div>
        <nav className="space-y-1 p-4">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive ? "bg-brand-50 text-brand-700" : "text-gray-600 hover:bg-gray-50"
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
          <Link
            to="/"
            className="mt-4 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-400 hover:bg-gray-50"
          >
            <FiArrowLeft size={18} />
            Back to store
          </Link>
        </nav>
      </aside>
      <main className="flex-1 p-8">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;