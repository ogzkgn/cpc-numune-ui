import { parseISO } from "date-fns";

import type {
  CompanyProductRecord,
  CompanyProductStatus,
  Product,
  ProductType,
  TripCompletion,
  TripItem,
  TripDutyType
} from "../types";

const isSamplingDuty = (dutyType: TripDutyType | undefined) => dutyType === "NUMUNE" || dutyType === "BOTH";

export const buildSampleCounts = (tripItems: TripItem[], year?: number) => {
  const counts = new Map<number, number>();

  tripItems.forEach((item) => {
    if (!item.sampled || !isSamplingDuty(item.dutyType)) return;
    if (year) {
      if (!item.sampledAt) return;
      const date = parseISO(item.sampledAt);
      if (Number.isNaN(date.getTime()) || date.getFullYear() !== year) return;
    }

    counts.set(item.companyProductId, (counts.get(item.companyProductId) ?? 0) + 1);
  });

  return counts;
};

export const getRequiredSampleCount = (productType: ProductType, status: CompanyProductStatus = "devam") => {
  if (status === "iptal" || status === "aski") {
    return 0;
  }

  if (status === "kesikli") {
    return 3;
  }

  return productType === "concrete" ? 3 : 6;
};

export const getAnnualRequiredSampleCount = (
  record: CompanyProductRecord,
  product?: Product,
  status: CompanyProductStatus = record.status ?? "devam"
) => {
  if (status === "iptal" || status === "aski") return 0;
  const requiresSampling = record.requiresSampling ?? product?.requiresSampling ?? false;
  if (!requiresSampling) return 0;

  const intervalMonths = record.samplingIntervalMonths ?? product?.samplingIntervalMonths;
  if (intervalMonths && intervalMonths > 0) {
    return Math.max(1, Math.floor(12 / intervalMonths));
  }

  return getRequiredSampleCount(record.productType, status);
};

export const generateLabEntryCode = ({
  productCode,
  btCode,
  performedAt,
  tripItems,
  excludeTripItemId,
  companyProductId
}: {
  productCode?: string;
  btCode?: string;
  performedAt?: string;
  tripItems: TripItem[];
  excludeTripItemId?: number;
  companyProductId?: number;
}): string | undefined => {
  if (!performedAt) return undefined;

  const sanitize = (value?: string) => {
    if (!value) return "";
    const normalized = value.replace(/\s+/g, "").trim();
    if (!normalized || normalized.toLowerCase() === "undefined" || normalized.toLowerCase() === "null") return "";
    return normalized;
  };
  const sanitizedProductCode = sanitize(productCode);
  const sanitizedBt = sanitize(btCode);
  const baseCode =
    sanitizedProductCode ||
    sanitizedBt ||
    (companyProductId !== undefined ? `CP${companyProductId}` : "");
  if (!baseCode) return undefined;

  const date = new Date(performedAt);
  if (Number.isNaN(date.getTime())) return undefined;

  const targetYear = date.getFullYear();
  // Count existing samples for the same company product in the same calendar year
  const sequence = tripItems.reduce((acc, item) => {
    if (excludeTripItemId && item.id === excludeTripItemId) return acc;
    if (!item.sampled || !item.sampledAt) return acc;
    if (companyProductId && item.companyProductId !== companyProductId) return acc;
    const sampledYear = parseISO(item.sampledAt).getFullYear();
    if (sampledYear !== targetYear) return acc;
    return acc + 1;
  }, 0) + 1;

  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);

  return `${baseCode}.T${sequence}.${month}${year}`;
};
