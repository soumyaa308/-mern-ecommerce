import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { fetchAllUsers, updateUserRole, updateUserStatus } from "../../features/admin/adminSlice";

const AdminUsers = () => {
  const dispatch = useDispatch();
  const { users } = useSelector((state) => state.admin);
  const { user: currentUser } = useSelector((state) => state.auth);

  useEffect(() => {
    dispatch(fetchAllUsers());
  }, [dispatch]);

  const handleRoleChange = (id, role) => {
    dispatch(updateUserRole({ id, role })).then((result) => {
      if (updateUserRole.fulfilled.match(result)) {
        toast.success("Role updated");
      } else {
        toast.error(result.payload || "Could not update role");
      }
    });
  };

  const handleStatusToggle = (id, isActive) => {
    dispatch(updateUserStatus({ id, isActive: !isActive })).then((result) => {
      if (updateUserStatus.fulfilled.match(result)) {
        toast.success(isActive ? "User deactivated" : "User activated");
      } else {
        toast.error(result.payload || "Could not update status");
      }
    });
  };

  return (
    <div>
      <h1 className="text-2xl font-bold">Users</h1>

      <div className="card mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-100 text-left text-xs uppercase text-gray-400">
            <tr>
              <th className="p-4">Name</th>
              <th className="p-4">Email</th>
              <th className="p-4">Role</th>
              <th className="p-4">Status</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u._id} className="border-b border-gray-50">
                <td className="p-4 font-medium">{u.name}</td>
                <td className="p-4 text-gray-500">{u.email}</td>
                <td className="p-4">
                  <select
                    value={u.role}
                    disabled={u._id === currentUser?.id}
                    onChange={(e) => handleRoleChange(u._id, e.target.value)}
                    className="rounded-lg border border-gray-300 px-2 py-1 text-xs"
                  >
                    <option value="customer">Customer</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td className="p-4">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      u.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {u.isActive ? "Active" : "Deactivated"}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <button
                    disabled={u._id === currentUser?.id}
                    onClick={() => handleStatusToggle(u._id, u.isActive)}
                    className="text-xs text-brand-600 hover:underline disabled:text-gray-300"
                  >
                    {u.isActive ? "Deactivate" : "Activate"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminUsers;