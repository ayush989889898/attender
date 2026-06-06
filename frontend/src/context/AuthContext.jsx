import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import api from "../api/client.js";

const AuthContext = createContext(null);
const TOKEN_KEY = "attender_token";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [bootstrapping, setBootstrapping] = useState(true);

  const applyTheme = useCallback((theme) => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
  }, []);

  const loadMe = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);

    if (!token) {
      setUser(null);
      setBootstrapping(false);
      return;
    }

    try {
      const { data } = await api.get("/auth/me");
      setUser(data.user);
      applyTheme(data.user.theme || "light");
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      setUser(null);
    } finally {
      setBootstrapping(false);
    }
  }, [applyTheme]);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  const refreshUser = useCallback(async () => {
    await loadMe();
  }, [loadMe]);

  const updateUser = useCallback((updates) => {
    setUser((prev) => {
      if (!prev) return prev;
      return { ...prev, ...updates };
    });
  }, []);

  const login = useCallback(async (username, password, role) => {
    const { data } = await api.post("/auth/login", {
      username,
      password,
      role,
    });

    localStorage.setItem(TOKEN_KEY, data.token);
    setUser(data.user);
    applyTheme(data.user.theme || "light");
  }, [applyTheme]);

  const register = useCallback(async (payload) => {
    const { data } = await api.post("/auth/register", payload);

    localStorage.setItem(TOKEN_KEY, data.token);
    setUser(data.user);
    applyTheme(data.user.theme || "light");
  }, [applyTheme]);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
    applyTheme("light");
  }, [applyTheme]);

  const value = useMemo(
    () => ({
      user,
      bootstrapping,
      login,
      register,
      logout,
      refreshUser,
      applyTheme,
      updateUser,
    }),
    [user, bootstrapping, login, register, logout, refreshUser, applyTheme, updateUser]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}