import { useEffect, useState } from 'react';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function SettingsPage() {
  const { user, refreshUser, applyTheme } = useAuth();
  
  // Profile State
  const [profileForm, setProfileForm] = useState({ firstName: '', lastName: '', email: '' });
  const [profileMsg, setProfileMsg] = useState({ text: '', type: '' }); // type: 'success' or 'error'

  // Security State
  const [securityForm, setSecurityForm] = useState({ currentPassword: '', newPassword: '' });
  const [securityMsg, setSecurityMsg] = useState({ text: '', type: '' });

  // Preferences State
  const [theme, setTheme] = useState('light');

  // Load user data into form on mount
  useEffect(() => {
    if (user) {
      setProfileForm({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
      });
      setTheme(user.theme || 'light');
    }
  }, [user]);

  // Handle Profile Update
  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setProfileMsg({ text: '', type: '' });
    try {
      await api.patch('/users/me', profileForm);
      await refreshUser(); // This updates the sidebar and header instantly
      setProfileMsg({ text: 'Profile updated successfully! ✅', type: 'success' });
      
      // Clear message after 3 seconds
      setTimeout(() => setProfileMsg({ text: '', type: '' }), 3000);
    } catch (err) {
      setProfileMsg({ text: err.message || 'Failed to update profile', type: 'error' });
    }
  };

  // Handle Password Update
  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setSecurityMsg({ text: '', type: '' });
    try {
      await api.patch('/users/me/password', securityForm);
      setSecurityForm({ currentPassword: '', newPassword: '' });
      setSecurityMsg({ text: 'Password changed successfully! 🔐', type: 'success' });
    } catch (err) {
      // Check if backend returned a 400/401 for wrong password
      const errorText = err.message.includes('incorrect') ? '❌ Current password is wrong' : err.message;
      setSecurityMsg({ text: errorText, type: 'error' });
    }
  };

  // Handle Theme Change
  const handleThemeChange = async (newTheme) => {
    try {
      await api.patch('/users/me/preferences', { theme: newTheme });
      setTheme(newTheme);
      applyTheme(newTheme); // Applies 'dark' class to <html>
      await refreshUser();
    } catch (err) {
      console.error("Theme update failed");
    }
  };

  return (
  <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 pt-7 pb-22 px-7  sm:px-0 animate-in fade-in duration-500">
    
    {/* Header */}
    <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
      <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
        Settings
      </h1>
      <p className="text-slate-500 text-sm">
        Manage your account preferences and security.
      </p>
    </div>

    {/* PROFILE */}
    <section className="bg-white dark:bg-slate-900/60 backdrop-blur rounded-3xl sm:rounded-[2.5rem] p-5 sm:p-8 border border-slate-100 dark:border-slate-800 shadow-sm">
      
      <h2 className="text-base sm:text-lg font-bold mb-5 flex items-center gap-2 dark:text-white">
        <span className="bg-indigo-100 dark:bg-indigo-900/40 p-2 rounded-xl">👤</span>
        Personal Information
      </h2>

      {profileMsg.text && (
        <div
          className={`mb-5 p-3 sm:p-4 rounded-2xl text-sm font-semibold ${
            profileMsg.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/30'
              : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-100 dark:border-red-900/30'
          }`}
        >
          {profileMsg.text}
        </div>
      )}

      <form className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6" onSubmit={handleProfileUpdate}>
        
        <div className="space-y-2">
          <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">
            First Name
          </label>
          <input
            className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white border border-transparent dark:border-slate-800 rounded-2xl px-4 py-3 focus:ring-2 ring-brand-500 outline-none transition"
            value={profileForm.firstName}
            onChange={e => setProfileForm({ ...profileForm, firstName: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">
            Last Name
          </label>
          <input
            className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white border border-transparent dark:border-slate-800 rounded-2xl px-4 py-3 focus:ring-2 ring-brand-500 outline-none transition"
            value={profileForm.lastName}
            onChange={e => setProfileForm({ ...profileForm, lastName: e.target.value })}
          />
        </div>

        <div className="md:col-span-2 space-y-2">
          <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">
            Email Address
          </label>
          <input
            type="email"
            className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white border border-transparent dark:border-slate-800 rounded-2xl px-4 py-3 focus:ring-2 ring-brand-500 outline-none transition"
            value={profileForm.email}
            onChange={e => setProfileForm({ ...profileForm, email: e.target.value })}
          />
        </div>

        <div className="md:col-span-2 flex justify-end pt-2">
          <button className="w-full sm:w-auto bg-brand-600 text-white px-6 sm:px-8 py-3 rounded-2xl font-bold hover:bg-brand-700 active:scale-95 transition">
            Save Changes
          </button>
        </div>
      </form>
    </section>

    {/* APPEARANCE */}
    <section className="bg-white dark:bg-slate-900/60 backdrop-blur rounded-3xl sm:rounded-[2.5rem] p-5 sm:p-8 border border-slate-100 dark:border-slate-800 shadow-sm">
      
      <h2 className="text-base sm:text-lg font-bold mb-5 flex items-center gap-2 dark:text-white">
        <span className="bg-amber-100 dark:bg-amber-900/40 p-2 rounded-xl">✨</span>
        Appearance
      </h2>

      <div className="flex p-1 bg-slate-100 dark:bg-slate-950 rounded-2xl w-full sm:w-fit">
        <button
          onClick={() => handleThemeChange('light')}
          className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 rounded-xl text-sm font-bold transition ${
            theme === 'light'
              ? 'bg-white dark:bg-slate-800 shadow text-brand-600'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          ☀️ Light
        </button>

        <button
          onClick={() => handleThemeChange('dark')}
          className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 rounded-xl text-sm font-bold transition ${
            theme === 'dark'
              ? 'bg-slate-800 shadow text-white'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          🌙 Dark
        </button>
      </div>
    </section>

    {/* SECURITY */}
    <section className="bg-white dark:bg-slate-900/60 backdrop-blur rounded-3xl sm:rounded-[2.5rem] p-5 sm:p-8 border border-slate-100 dark:border-slate-800 shadow-sm">
      
      <h2 className="text-base sm:text-lg font-bold mb-5 flex items-center gap-2 dark:text-white">
        <span className="bg-red-100 dark:bg-red-900/40 p-2 rounded-xl">🛡️</span>
        Account Security
      </h2>

      {securityMsg.text && (
        <div
          className={`mb-5 p-3 sm:p-4 rounded-2xl text-sm font-semibold ${
            securityMsg.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/30'
              : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-100 dark:border-red-900/30'
          }`}
        >
          {securityMsg.text}
        </div>
      )}

      <form className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6" onSubmit={handlePasswordUpdate}>
        
        <div className="space-y-2">
          <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">
            Current Password
          </label>
          <input
            type="password"
            required
            className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white border border-transparent dark:border-slate-800 rounded-2xl px-4 py-3 focus:ring-2 ring-red-500 outline-none transition"
            value={securityForm.currentPassword}
            onChange={e => setSecurityForm({ ...securityForm, currentPassword: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">
            New Password
          </label>
          <input
            type="password"
            required
            className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white border border-transparent dark:border-slate-800 rounded-2xl px-4 py-3 focus:ring-2 ring-brand-500 outline-none transition"
            value={securityForm.newPassword}
            onChange={e => setSecurityForm({ ...securityForm, newPassword: e.target.value })}
          />
        </div>

        <div className="md:col-span-2 flex justify-end pt-2">
          <button className="w-full sm:w-auto bg-slate-900 dark:bg-white dark:text-slate-900 text-white px-6 sm:px-8 py-3 rounded-2xl font-bold hover:opacity-80 active:scale-95 transition">
            Update Password
          </button>
        </div>
      </form>
    </section>
  </div>
);
}