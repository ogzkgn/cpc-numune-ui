import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "../lib/apiClient";
import type { TripItemLabStatus } from "../types";

export type PendingSample = {
  tripItemId: number;
  tripId: number;
  companyProductId: number;
  companyName: string;
  companyBtCode?: string;
  productName: string;
  productCode?: string;
  location?: string;
  performedAt: string;
  trackingCode?: string;
  labStatus?: TripItemLabStatus;
};

export const pendingSamplesQueryKey = ["pending-samples"];

export const fetchPendingSamples = async (): Promise<PendingSample[]> => {
  const data = await apiFetch<any[]>("/lab-shipments/pending");
  return data.map((row) => ({
    tripItemId: Number(row.tripItemId ?? row.trip_item_id),
    tripId: Number(row.tripId ?? row.trip_id),
    companyProductId: Number(row.companyProductId ?? row.company_product_id),
    companyName: row.companyName ?? row.company_name ?? "-",
    companyBtCode: row.companyBtCode ?? row.company_bt_code ?? row.btCode ?? row.bt_code,
    productName: row.productName ?? row.product_name ?? "-",
    productCode: row.productCode ?? row.product_code ?? undefined,
    location: row.location ?? undefined,
    performedAt: row.performedAt ?? row.performed_at ?? "",
    trackingCode: row.trackingCode ?? row.tracking_code ?? undefined,
    labStatus: row.labStatus ?? row.lab_status ?? undefined
  }));
};

export const usePendingSamplesQuery = () =>
  useQuery<PendingSample[]>({
    queryKey: pendingSamplesQueryKey,
    queryFn: fetchPendingSamples,
    staleTime: 60_000
  });
