import { parseISO } from "date-fns";

import type { CompanyProductStatus, ProductType, TripCompletion, TripItem, TripDutyType } from "../types";

const isSamplingDuty = (dutyType: TripDutyType | undefined) => dutyType === "NUMUNE" || dutyType === "BOTH";

export const buildAnnualSampleCounts = (
  tripItems: TripItem[],
  tripCompletions: TripCompletion[],
  year: number
) => {
  const tripItemMap = new Map<number, TripItem>();
  tripItems.forEach((item) => {
    tripItemMap.set(item.id, item);
  });

  const counts = new Map<number, number>();

  tripCompletions.forEach((completion) => {
    completion.entries.forEach((entry) => {
      const dutyType = entry.dutyType ?? tripItemMap.get(entry.tripItemId)?.dutyType;
      if (!isSamplingDuty(dutyType) || !entry.performedAt) return;
      const date = parseISO(entry.performedAt);
      if (Number.isNaN(date.getTime()) || date.getFullYear() !== year) return;
      const tripItem = tripItemMap.get(entry.tripItemId);
      if (!tripItem) return;
      counts.set(tripItem.companyProductId, (counts.get(tripItem.companyProductId) ?? 0) + 1);
    });
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

export const generateLabEntryCode = ({
  productCode,
  performedAt,
  tripItems,
  excludeTripItemId
}: {
  productCode?: string;
  performedAt?: string;
  tripItems: TripItem[];
  excludeTripItemId?: number;
}): string | undefined => {
  if (!productCode || !performedAt) return undefined;

  let maxSequence = 0;
  tripItems.forEach((item) => {
    if (excludeTripItemId && item.id === excludeTripItemId) return;
    if (!item.labEntryCode) return;
    const [codePrefix] = item.labEntryCode.split(".");
    if (codePrefix !== productCode) return;
    const match = item.labEntryCode.match(/\.T(\d+)\./);
    if (!match) return;
    const seq = Number(match[1]);
    if (!Number.isNaN(seq)) {
      maxSequence = Math.max(maxSequence, seq);
    }
  });

  const date = new Date(performedAt);
  if (Number.isNaN(date.getTime())) return undefined;

  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);
  const nextSequence = maxSequence + 1;

  return `${productCode}.T${nextSequence}.${month}${year}`;
};

