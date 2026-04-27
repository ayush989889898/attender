import { NavLink, useNavigate } from 'react-router-dom'; // 1. Added useNavigate
import { useAuth } from '../context/AuthContext.jsx';

const linkBase =
  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800';

function Item({ to, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `${linkBase} ${
          isActive
            ? 'bg-indigo-50 text-indigo-700 dark:bg-slate-800 dark:text-white'
            : ''
        }`
      }
      end={to === '/app'}
    >
      {children}
    </NavLink>
  );
}

export default function Sidebar({ onNavigate }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate(); // 2. Initialize navigate
  const role = user?.role;

  const close = () => onNavigate?.();

  // Handle Logout with Redirect
  const handleSignOut = async () => {
    await logout(); // Clear state/tokens
    navigate('/', { replace: true }); // 3. Redirect to HomePage
  };

  const initials =
    user?.firstName && user?.lastName
      ? `${user.firstName[0] || ''}${user.lastName[0] || ''}`.toUpperCase()
      : (user?.username || '?').slice(0, 2).toUpperCase();

  const navForRole = () => {
    if (role === 'admin') {
      return (
        <>
          <Item to="/app"><span>Dashboard</span></Item>
          <Item to="/app/classes"><span>Classes</span></Item>
          <Item to="/app/attendance"><span>Attendance</span></Item>
          <Item to="/app/reports"><span>Reports</span></Item>
          <Item to="/app/messages"><span>Messages</span></Item>
          <Item to="/app/settings"><span>Settings</span></Item>
        </>
      );
    }
    if (role === 'teacher') {
      return (
        <>
          <Item to="/app"><span>Dashboard</span></Item>
          <Item to="/app/classes"><span>Classes</span></Item>
          <Item to="/app/reports"><span>Reports</span></Item>
          <Item to="/app/messages"><span>Messages</span></Item>
          <Item to="/app/settings"><span>Settings</span></Item>
        </>
      );
    }
    return (
      <>
        <Item to="/app"><span>Dashboard</span></Item>
        <Item to="/app/classes"><span>Classes</span></Item>
        <Item to="/app/messages"><span>Messages</span></Item>
        <Item to="/app/settings"><span>Settings</span></Item>
      </>
    );
  };

  return (
    <aside className="flex h-full w-64 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      
      <div className="flex items-center gap-1 px-5 py-6">
        <img
          src="/logo.png"
          alt="Attender Logo"
          className="w-8 h-8 object-contain"
        />
        <span className="text-lg font-semibold text-slate-900 dark:text-white tracking-tight">
          Attender
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-2 px-3 py-2" onClick={close}>
        {navForRole()}
      </nav>

      <div className="border-t border-slate-200 p-4 dark:border-slate-800">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-xs font-semibold text-white">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="truncate text-xs capitalize text-slate-500">
              {user?.role}
            </p>
          </div>
        </div>

        {/* 🔥 UPDATED BUTTON */}
        <button
          type="button"
          onClick={handleSignOut}
          className="w-full rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
}