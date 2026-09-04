import { useSelector } from "react-redux";
import { Navigate, Outlet } from "react-router-dom";

/**
 * Guards routes that require an admin role. Assumes the user is already
 * authenticated (nest this under ProtectedRoute in the route tree, or
 * check both conditions here).
 */
const AdminRoute = () => {
  const { user } = useSelector((state) => state.auth);

  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default AdminRoute;