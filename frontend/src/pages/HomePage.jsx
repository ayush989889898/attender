import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx"; // Ensure this path is correct

export default function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useAuth(); // Access auth state

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-indigo-100 selection:text-indigo-700">

      {/* Navbar */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-slate-200 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 md:h-20 flex items-center justify-between">

          {/* Logo */}
          <div className="flex items-center gap-2">
            <img 
              src="/logo.png" 
              alt="Attender Logo" 
              className="w-8 h-8 md:w-9 md:h-9 object-contain"
            />
            <span className="text-base md:text-lg font-black text-slate-900">
              Attender
            </span>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8 text-sm font-bold text-slate-600">
            <a href="#features" className="hover:text-indigo-600 transition">Features</a>
            <a href="#how-it-works" className="hover:text-indigo-600 transition">How It Works</a>
          </div>

          {/* ✅ UPDATED: Desktop Buttons (Conditional) */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <Link 
                to="/app/dashboard" 
                className="bg-indigo-600 text-white px-5 py-2 rounded-full text-sm font-bold shadow hover:bg-indigo-700 transition"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link to="/login" className="text-sm font-bold text-slate-600 hover:text-indigo-600">
                  Log In
                </Link>
                <Link 
                  to="/Signup" 
                  className="bg-indigo-600 text-white px-5 py-2 rounded-full text-sm font-bold shadow hover:bg-indigo-700 transition"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button 
              onClick={() => setMenuOpen(!menuOpen)} 
              className="text-2xl"
            >
              {menuOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>

        {/* ✅ UPDATED: Mobile Dropdown (Conditional) */}
        {menuOpen && (
          <div className="md:hidden bg-white border-t px-4 py-4 space-y-3 shadow-sm animate-in slide-in-from-top duration-300">
            <a href="#features" className="block text-sm font-medium">Features</a>
            <a href="#how-it-works" className="block text-sm font-medium">How It Works</a>
            {user ? (
              <Link to="/app/dashboard" className="block text-sm font-medium text-indigo-600">Dashboard</Link>
            ) : (
              <>
                <Link to="/login" className="block text-sm font-medium">Log In</Link>
                <Link to="/Signup" className="block text-sm font-medium text-indigo-600">Sign Up</Link>
              </>
            )}
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <header className="pt-32 md:pt-40 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-6 md:space-y-8">

          <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest border border-indigo-100">
            ✨ Smart Attendance System
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-tight">
            Attendance Made <br />
            <span className="text-indigo-600">Effortless.</span>
          </h1>

          <p className="text-base md:text-lg text-slate-500 max-w-2xl mx-auto">
            QR-based attendance tracking with real-time analytics, class messaging, and student insights — all in one powerful app.
          </p>

          <div className="pt-4">
            <Link 
              to={user ? "/app/dashboard" : "/Signup"} 
              className="bg-indigo-600 text-white px-6 sm:px-8 py-3 rounded-full font-bold shadow-md hover:bg-indigo-700 transition inline-block"
            >
              {user ? "Go to Dashboard" : "Get Started"}
            </Link>
          </div>

        </div>
      </header>

      {/* Features Section */}
      <section id="features" className="py-20 md:py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-3xl md:text-4xl font-black">Features</h2>
            <p className="text-slate-500 mt-2">Everything you need for modern attendance management.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8">
            <FeatureCard icon="📱" title="QR Attendance" desc="Secure QR codes for instant attendance." />
            <FeatureCard icon="💬" title="Class Messaging" desc="Share notes and announcements." />
            <FeatureCard icon="📊" title="Smart Reports" desc="Track trends with insights." />
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 md:py-24 px-6 bg-slate-50">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-black mb-4">How It Works</h2>
          <p className="text-slate-500 mb-12 md:mb-16">
            Four simple steps to seamless attendance.
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            <Step icon="🛡️" step="1" title="Generate QR" desc="Teacher creates QR." />
            <Step icon="🤳" step="2" title="Scan" desc="Students scan instantly." />
            <Step icon="📝" step="3" title="Recorded" desc="Attendance auto logged." />
            <Step icon="🔔" step="4" title="Notify" desc="Admins stay updated." />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <img 
              src="/logo.png" 
              alt="Attender Logo" 
              className="w-6 h-6 object-contain"
            />
            <span className="font-black text-sm text-slate-900">Attender</span>
          </div>

          <div className="flex gap-6 md:gap-10 text-sm text-slate-600 font-bold">
            <a href="#features" className="hover:text-indigo-600 transition">Features</a>
            <a href="#how-it-works" className="hover:text-indigo-600 transition">How It Works</a>
          </div>
        </div>

        <div className="text-center mt-6 text-xs text-slate-400">
          © 2026 Attender. All rights reserved.
        </div>
      </footer>

    </div>
  );
}

/* SUB-COMPONENTS */

function FeatureCard({ icon, title, desc }) {
  return (
    <div className="p-8 rounded-3xl border border-slate-100 bg-white hover:shadow-xl hover:-translate-y-1 transition duration-300">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="font-black text-slate-900 mb-2 uppercase tracking-tight">{title}</h3>
      <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
    </div>
  );
}

function Step({ icon, step, title, desc }) {
  return (
    <div className="text-center space-y-3">
      <div className="w-14 h-14 md:w-16 md:h-16 mx-auto bg-white border border-slate-100 rounded-2xl shadow-sm flex items-center justify-center text-2xl md:text-3xl">
        {icon}
      </div>
      <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">STEP {step}</p>
      <h4 className="font-bold text-slate-900">{title}</h4>
      <p className="text-xs text-slate-400 leading-tight px-2">{desc}</p>
    </div>
  );
}