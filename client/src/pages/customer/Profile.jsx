import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { logoutUser } from "../../features/auth/authSlice";

const Profile = () => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await dispatch(logoutUser());
    toast.success("Logged out");
    navigate("/");
  };

  return (
    <div className="container-app py-16">
      <h1 className="text-2xl font-bold">My Profile</h1>
      <div className="card mt-6 max-w-md p-6">
        <p className="text-sm text-gray-500">Name</p>
        <p className="font-medium">{user?.name}</p>
        <p className="mt-4 text-sm text-gray-500">Email</p>
        <p className="font-medium">{user?.email}</p>
        <p className="mt-4 text-sm text-gray-500">Role</p>
        <p className="font-medium capitalize">{user?.role}</p>
        <button onClick={handleLogout} className="btn-secondary mt-6">
          Log Out
        </button>
      </div>
    </div>
  );
};

export default Profile;