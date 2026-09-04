import { useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import authService from "../../services/authService";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle");
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("loading");
    try {
      await authService.forgotPassword(email);
      setSent(true);
      toast.success("If that email exists, a reset link has been sent");
    } catch (err) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setStatus("idle");
    }
  };

  return (
    <div className="container-app flex min-h-[70vh] items-center justify-center py-16">
      <div className="w-full max-w-md">
        <h1 className="text-center text-2xl font-bold">Forgot Password</h1>
        <p className="mt-1 text-center text-sm text-gray-500">
          Enter your email and we'll send you a reset link.
        </p>

        {sent ? (
          <div className="mt-8 rounded-lg bg-green-50 p-4 text-center text-sm text-green-700">
            Check your email for a password reset link. It'll expire in 30 minutes.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                placeholder="you@example.com"
              />
            </div>
            <button type="submit" disabled={status === "loading"} className="btn-primary w-full">
              {status === "loading" ? "Sending..." : "Send Reset Link"}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-gray-500">
          Remembered your password?{" "}
          <Link to="/login" className="font-medium text-brand-600 hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;