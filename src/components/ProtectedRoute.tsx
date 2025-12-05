import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuthStore } from "../state/useAuthStore";
import { useAppStore } from "../state/useAppStore";

const allowedByRole: Record<string, (path: string) => boolean> = {
  lab: (path) => path === "/laboratuvar" || path.startsWith("/laboratuvar/"),
  admin: () => true
};

const ProtectedRoute = () => {
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const loading = useAuthStore((state) => state.loading);
  const bootstrap = useAuthStore((state) => state.bootstrap);
  const setActiveRole = useAppStore((state) => state.setActiveRole);
  const activeRole = useAppStore((state) => state.activeRole);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (user?.role && user.role !== activeRole) {
      setActiveRole(user.role);
    }
  }, [user?.role, activeRole, setActiveRole]);

  if (loading && !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-600">
        Oturum doğrulanıyor...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const canAccess = allowedByRole[user.role] ? allowedByRole[user.role](location.pathname) : true;
  if (!canAccess) {
    const fallback = user.role === "lab" ? "/laboratuvar" : "/";
    return <Navigate to={fallback} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
