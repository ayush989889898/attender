import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import Layout from "./Layout.jsx";
import MobileLayout from "../pages/MobileLayout.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function AppLayoutSwitcher() {
  const [isMobile, setIsMobile] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center">
        Loading layout...
      </div>
    );
  }

  return isMobile ? (
    <MobileLayout>
      <Outlet />
    </MobileLayout>
  ) : (
    <Layout>
      <Outlet />
    </Layout>
  );
}