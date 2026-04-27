import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const successMsg = location.state?.message;

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password, role);
      navigate("/app", { replace: true });
    } catch (err) {
      setError(err.message || "Invalid login credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">

      {/* Card */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 sm:p-8">

        {/* Logo + Title */}
        <div className="text-center mb-6">
          <img
            src="/logo.png"
            alt="logo"
            className="w-16 h-16 mx-auto mb-3 rounded-full object-contain"
          />
          <h1 className="text-2xl font-black text-slate-900">Attender</h1>
          <p className="text-sm text-slate-500">Welcome back </p>
        </div>

        {/* Success Message */}
        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-lg font-semibold text-center">
            {successMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={submit} className="space-y-4">

          {/* Username */}
          <input
            required
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          />

          {/* Role */}
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          >
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
            <option value="admin">Admin</option>
          </select>

          {/* Password */}
          <input
            required
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          />

          {/* Error */}
          {error && (
            <p className="text-xs text-red-600 font-semibold text-center">
              {error}
            </p>
          )}

          {/* Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition active:scale-95"
          >
            {loading ? "Logging in..." : "Sign In"}
          </button>
        </form>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-slate-600">
          Don’t have an account?{" "}
          <Link to="/signup" className="text-indigo-600 font-semibold">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}