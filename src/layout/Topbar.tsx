import { useEffect, useRef } from "react";
import type { ChangeEvent } from "react";
import { Bell } from "lucide-react";

import Button from "../components/ui/Button";
import { useAppStore } from "../state/useAppStore";

const roleLabels = {
  admin: "Yönetici",
  lab: "Laboratuvar"
} as const;

const Topbar = () => {
  const activeRole = useAppStore((state) => state.activeRole);
  const setActiveRole = useAppStore((state) => state.setActiveRole);
  const searchRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "/") {
        const target = event.target as HTMLElement;
        const isInputTarget = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
        if (!isInputTarget) {
          event.preventDefault();
          searchRef.current?.focus();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleRoleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value as typeof activeRole;
    setActiveRole(value);
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur md:px-6">
      <div className="flex flex-1 items-center gap-3">
        <div className="relative hidden max-w-sm flex-1 items-center md:flex">
          <input
            ref={searchRef}
            type="search"
            placeholder="Şirket, ürün veya standart ara..."
            aria-label="Global arama"
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-3 text-sm shadow-sm transition focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
          />
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
    </header>
  );
};

export default Topbar;