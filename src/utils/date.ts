import {
  addMonths,
  differenceInCalendarMonths,
  endOfMonth,
  format,
  isAfter,
  parseISO,
  startOfMonth
} from "date-fns";
import { tr } from "date-fns/locale";

import type { CompanyProduct, CompanyProductStatus, Product, ProductType } from "../types";

const SAMPLING_INTERVAL_MONTHS: Record<ProductType, number> = {
  concrete: 4,
  cement: 2,
  slag: 2,
  fly_ash: 2
};

const APPROACHING_THRESHOLD: Record<ProductType, number> = {
  concrete: 3,
  cement: 1,
  slag: 1,
  fly_ash: 1
};

const OVERDUE_THRESHOLD: Record<ProductType, number> = {
  concrete: 4,
  cement: 2,
  slag: 2,
  fly_ash: 2
};

export const getSamplingIntervalMonths = (productType: ProductType, status: CompanyProductStatus = "devam") => {
  if (status === "iptal" || status === "aski") {
    return undefined;
  }

  const baseInterval = SAMPLING_INTERVAL_MONTHS[productType] ?? 3;
  if (status === "kesikli") {
    return baseInterval * 2;
  }

  return baseInterval;
};

export type PriorityFlag = "overdue" | "approaching" | "ok";

export const formatDate = (value?: string | null, fallback = "-", options?: Intl.DateTimeFormatOptions) => {
  if (!value) return fallback;
  const date = parseISO(value);
  return format(date, options?.month === "long" ? "MMMM yyyy" : "dd.MM.yyyy", {
    locale: tr
  });
};

export const toISODate = (date: Date) => format(date, "yyyy-MM-dd");

export const calculateNextDueDate = (companyProduct: CompanyProduct, product: Product) => {
  const last = companyProduct.lastSampleDate ? parseISO(companyProduct.lastSampleDate) : undefined;
  if (!last) return undefined;
  const status = (companyProduct.status ?? "devam") as CompanyProductStatus;
  const months = getSamplingIntervalMonths(product.productType, status);
  if (!months) return undefined;
  return addMonths(last, months);
};

export const calculateNextInspectionDueDate = (companyProduct: CompanyProduct) => {
  const last = companyProduct.lastInspectionDate ? parseISO(companyProduct.lastInspectionDate) : undefined;
  if (!last) return undefined;
  return addMonths(last, 12);
};

export const getPriorityFlag = (companyProduct: CompanyProduct, product: Product): PriorityFlag => {
  if (!companyProduct.lastSampleDate) return "ok";

  const status = (companyProduct.status ?? "devam") as CompanyProductStatus;
  const interval = getSamplingIntervalMonths(product.productType, status);
  if (!interval) {
    return "ok";
  }

  const lastSampleMonth = startOfMonth(parseISO(companyProduct.lastSampleDate));
  const today = new Date();
  const monthsSinceLast = differenceInCalendarMonths(startOfMonth(today), lastSampleMonth);

  if (monthsSinceLast >= interval) {
    return "overdue";
  }

  if (monthsSinceLast >= Math.max(interval - 1, 0)) {
    return "approaching";
  }

  return "ok";
};

export const getInspectionPriorityFlag = (companyProduct: CompanyProduct): PriorityFlag => {
  if (!companyProduct.lastInspectionDate) {
    return "overdue";
  }

  const lastInspectionMonth = startOfMonth(parseISO(companyProduct.lastInspectionDate));
  const today = startOfMonth(new Date());
  const monthsSinceLast = differenceInCalendarMonths(today, lastInspectionMonth);

  if (monthsSinceLast >= 12) {
    return "overdue";
  }

  if (monthsSinceLast >= 10) {
    return "approaching";
  }

  return "ok";
};
