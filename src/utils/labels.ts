import type { ProductType, TripStatus, TripItemLabStatus, EmployeeStatus } from "../types";

export const productTypeLabels: Record<ProductType, string> = {
  concrete: "Beton",
  cement: "Çimento",
  slag: "Cüruf",
  fly_ash: "Uçucu Kül"
};

export const productTypeColors: Record<ProductType, string> = {
  concrete: "bg-blue-100 text-blue-700",
  cement: "bg-emerald-100 text-emerald-700",
  slag: "bg-purple-100 text-purple-700",
  fly_ash: "bg-amber-100 text-amber-700"
};

export const tripStatusLabels: Record<TripStatus, string> = {
  PLANNED: "Planlandı",
  ACTIVE: "Aktif",
  COMPLETED: "Tamamlandı",
  CANCELLED: "İptal"
};

export const tripStatusTokens: Record<TripStatus, string> = {
  PLANNED: "bg-slate-100 text-slate-700",
  ACTIVE: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-slate-300 text-slate-700"
};

export const labStatusLabels: Record<TripItemLabStatus, string> = {
  PENDING: "Bekliyor",
  ACCEPTED: "Kabul Edildi",
  DRAFT: "Taslak",
  SUBMITTED: "Gönderildi",
  APPROVED: "Onaylandı",
  WAITING_CONFIRM: "Onay Bekliyor"
};

export const labStatusTokens: Record<TripItemLabStatus, string> = {
  PENDING: "bg-slate-100 text-slate-700",
  ACCEPTED: "bg-slate-200 text-slate-800",
  DRAFT: "bg-amber-100 text-amber-700",
  SUBMITTED: "bg-blue-100 text-blue-700",
  APPROVED: "bg-green-100 text-green-700",
  WAITING_CONFIRM: "bg-orange-100 text-orange-700"
};

export const employeeStatusLabels: Record<EmployeeStatus, string> = {
  available: "Müsait",
  busy: "Sahada"
};

export const employeeStatusTokens: Record<EmployeeStatus, string> = {
  available: "bg-green-100 text-green-700",
  busy: "bg-slate-200 text-slate-700"
};

