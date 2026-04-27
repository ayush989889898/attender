import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function MobileLayout({ children }) {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Prevent rendering if auth is still resolving
  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const handleLogout = async () => {
    await logout();
    navigate("/", { replace: true }); // Redirect to HomePage after logout
  };

  // Define navigation based on user role
  const nav =
    user.role === "teacher"
      ? [
          { path: "/app/dashboard", icon: "🏠" },
          { path: "/app/classes", icon: "🎓" },
          { path: "/app/reports", icon: "📊" },
          { path: "/app/messages", icon: "💬" },
        ]
      : [
          { path: "/app/dashboard", icon: "🏠" },
          { path: "/app/classes", icon: "🎓" },
          { path: "/app/mark-attendance", icon: "/scan.png" }, // Custom Image Icon
          { path: "/app/messages", icon: "💬" },
        ];

  return (
    <div className="flex flex-col h-screen bg-slate-100 overflow-hidden">
      
      {/* 🔝 TOP HEADER */}
      <div className="flex justify-between items-center px-5 py-4 bg-white shadow-sm z-40">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="logo" className="w-6 h-6 object-contain" />
          <span className="font-black tracking-tighter text-slate-900">ATTENDER</span>
        </div>
        <button 
          onClick={() => setOpen(!open)} 
          className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 text-slate-600"
        >
          {open ? "✕" : "☰"}
        </button>
      </div>

      {/* 👤 PROFILE DROPDOWN */}
      {open && (
        <div className="absolute right-4 top-16 bg-white shadow-xl border border-slate-100 rounded-2xl z-[60] w-48 overflow-hidden animate-in fade-in zoom-in duration-200">
          <div className="px-4 py-3 border-b bg-slate-50">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Signed in as</p>
            <p className="text-sm font-black truncate text-slate-700">{user.username}</p>
          </div>
          <Link 
            to="/app/settings" 
            onClick={() => setOpen(false)}
            className="block px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 transition"
          >
            ⚙️ Settings
          </Link>
          <button 
            onClick={handleLogout} 
            className="w-full text-left px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-50 transition"
          >
            Logout
          </button>
        </div>
      )}

      {/* 📱 MAIN CONTENT AREA */}
      <main className="flex-1 overflow-y-auto pb-24 px-4 pt-4">
        {children}
      </main>

      {/* 🧭 BOTTOM NAVIGATION BAR */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-200 flex justify-around items-center py-3 pb-6 z-50">
        {nav.map((n, i) => {
          const isActive = location.pathname === n.path;
          const isImageIcon = n.icon.startsWith("/");

          return (
            <Link
              key={i}
              to={n.path}
              className={`flex flex-col items-center justify-center transition-all duration-300 ${
                isActive ? "scale-110" : "opacity-50"
              }`}
            >
              <div className="w-7 h-7 flex items-center justify-center">
                {isImageIcon ? (
                  <img
                    src={n.icon}
                    alt="nav-icon"
                    className="w-full h-full object-contain"
                    style={{
                      // This filter turns the black icon into Indigo-600 when active
                      filter: isActive 
                        ? "invert(31%) sepia(94%) saturate(2564%) hue-rotate(227deg) brightness(96%) contrast(101%)" 
                        : "none"
                    }}
                  />
                ) : (
                  <span className={`text-2xl ${isActive ? "" : "grayscale"}`}>
                    {n.icon}
                  </span>
                )}
              </div>
              
              {/* Optional indicator dot */}
              {isActive && (
                <div className="w-1 h-1 bg-indigo-600 rounded-full mt-1"></div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}