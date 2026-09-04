import { useSelector } from "react-redux";
import { Navigate, Outlet, useLocation } from "react-router-dom";

/**
 * Guards routes that require a logged-in user (profile, cart, checkout,
 * orders, wishlist, etc). Redirects to /login and remembers where the
 * user was headed so they land back there after logging in.
 */
const ProtectedRoute = () => {
  const { user } = useSelector((state) => state.auth);
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;