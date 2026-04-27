import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/client.js";

export default function Signup() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: "",
    firstName: "",
    lastName: "",
    email: "",
    rollNumber: "", // 1. Added rollNumber to state
    role: "student",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onChange = (k) => (e) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      // This sends the entire form object, including rollNumber, to your API
      await api.post("/auth/register", form);

      navigate("/login", {
        replace: true,
        state: { message: "Account created successfully! Please sign in." },
      });
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Signup failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 sm:p-8">
        <div className="text-center mb-6">
          <img
            src="/logo.png"
            alt="logo"
            className="w-16 h-16 mx-auto mb-3 rounded-full object-contain"
          />
          <h1 className="text-2xl font-black text-slate-900">Attender</h1>
          <p className="text-sm text-slate-500">Create your account</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <input
            required
            placeholder="Username"
            value={form.username}
            onChange={onChange("username")}
            className="w-full px-4 py-3 rounded-xl border bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          />

          <div className="grid grid-cols-2 gap-3">
            <input
              required
              placeholder="First Name"
              value={form.firstName}
              onChange={onChange("firstName")}
              className="w-full px-4 py-3 rounded-xl border bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
            <input
              required
              placeholder="Last Name"
              value={form.lastName}
              onChange={onChange("lastName")}
              className="w-full px-4 py-3 rounded-xl border bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>

          <input
            required
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={onChange("email")}
            className="w-full px-4 py-3 rounded-xl border bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          />

          <select
            value={form.role}
            onChange={onChange("role")}
            className="w-full px-4 py-3 rounded-xl border bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          >
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
          </select>

          {form.role === "student" && (
            <input
              required
              placeholder="Roll Number"
              value={form.rollNumber}
              onChange={onChange("rollNumber")}
              className="w-full px-4 py-3 rounded-xl border bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          )}

          <input
            required
            type="password"
            placeholder="Password (min 6 characters)"
            value={form.password}
            onChange={onChange("password")}
            className="w-full px-4 py-3 rounded-xl border bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          />

          {error && (
            <p className="text-xs text-red-600 font-semibold text-center">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition active:scale-95"
          >
            {loading ? "Creating account..." : "Sign Up"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Already have an account?{" "}
          <Link to="/login" className="text-indigo-600 font-semibold">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
