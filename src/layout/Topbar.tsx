import type { ChangeEvent } from "react";
import { NavLink } from "react-router-dom";
import { clsx } from "clsx";
import { Bell } from "lucide-react";

import Button from "../components/ui/Button";
import { useAppStore } from "../state/useAppStore";
import { navItems } from "./Sidebar";

const roleLabels = {
  admin: "Yönetici",
  lab: "Laboratuvar"
} as const;

const Topbar = () => {
  const activeRole = useAppStore((state) => state.activeRole);
  const setActiveRole = useAppStore((state) => state.setActiveRole);
  const handleRoleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value as typeof activeRole;
    setActiveRole(value);
  };

  const roleNavItems = navItems.filter((item) => item.roles.includes(activeRole));

  return (
    <header className="sticky top-0 z-30 flex flex-col gap-4 border-b border-slate-200 bg-white/90 px-4 py-4 backdrop-blur md:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <img src="/assets/logo.webp" alt="CPC Logo" className="h-12 w-12 object-contain" />
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Planlama Yönetimi</p>
            <h1 className="text-lg font-semibold text-slate-900">CPC Planlama</h1>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            icon={<Bell className="h-4 w-4" />}
            aria-label="Bildirimler"
            className="h-10 w-10 p-0"
          />
          <div className="flex flex-col">
            <label htmlFor="role" className="text-xs text-slate-500">
              Rol
            </label>
            <select
              id="role"
              value={activeRole}
              onChange={handleRoleChange}
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 shadow-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary/40"
            >
              <option value="admin">{roleLabels.admin}</option>
              <option value="lab">{roleLabels.lab}</option>
            </select>
          </div>
        </div>
      </div>
      <nav className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-600">
        {roleNavItems.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              clsx(
                "flex items-center gap-2 rounded-full px-3 py-1.5 transition",
                isActive ? "bg-brand-primary/10 text-brand-primary" : "hover:bg-slate-100 hover:text-slate-900"
              )
            }
            end={path === "/"}
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
};

export default Topbar;
