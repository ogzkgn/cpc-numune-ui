import { NavLink } from "react-router-dom";
import { clsx } from "clsx";
import { ClipboardList, FlaskConical, Home, Layers, Settings, TestTube2, Truck } from "lucide-react";

import { useAppStore } from "../state/useAppStore";
import type { UserRole } from "../state/useAppStore";

interface NavItem {
  path: string;
  label: string;
  icon: typeof Home;
  roles: UserRole[];
}

const navItems: NavItem[] = [
  { path: "/", label: "Gösterge Paneli", icon: Home, roles: ["admin"] },
  { path: "/bu-ay-vadesi", label: "Takip ve Planlama", icon: ClipboardList, roles: ["admin"] },
  { path: "/firma-urunleri", label: "Firma-Ürünler", icon: Layers, roles: ["admin"] },
  { path: "/seyahatler", label: "Seyahatler", icon: Truck, roles: ["admin"] },
  { path: "/laboratuvar", label: "Laboratuvar", icon: FlaskConical, roles: ["admin", "lab"] },
  { path: "/numuneler", label: "Numuneler", icon: TestTube2, roles: ["admin"] },
  { path: "/ayarlar", label: "Kontrol", icon: Settings, roles: ["admin"] }
];

const Sidebar = () => {
  const activeRole = useAppStore((state) => state.activeRole);

  return (
    <aside className="hidden w-64 flex-col border-r border-slate-200 bg-white/95 backdrop-blur-lg md:flex">
      <div className="flex h-20 items-center gap-2 border-b border-slate-200 px-6">
        <img 
          src="/assets/logo.webp"
          alt="CPC Logo"
          className="h-12 w-12 object-contain"
        />
        <div>
          <p className="text-sm font-medium text-slate-500">Planlama Yönetimi</p>
          <h1 className="text-lg font-semibold text-slate-900">CPC Planlama</h1>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems
          .filter((item) => item.roles.includes(activeRole))
          .map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-brand-primary/10 text-brand-primary"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )
              }
              end={path === "/"}
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
