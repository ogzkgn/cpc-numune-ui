import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "../lib/apiClient";
import type { TripCompletion, TripCompletionEntry } from "../types";

const mapEntry = (entry: any): TripCompletionEntry => {
  const rawTripItemId =
    entry.tripItemId ??
    entry.trip_item_id ??
    entry.companyProductId ??
    entry.company_product_id;
  const rawCompanyProductId =
    entry.company_product_id ??
    entry.companyProductId ??
    entry.tripItemId ??
    entry.trip_item_id;
  const companyProductId = Number(rawCompanyProductId);
  const mappedTripItemId = Number(rawTripItemId);
  return {
    tripItemId: Number.isFinite(mappedTripItemId) ? mappedTripItemId : companyProductId,
    companyProductId,
    dutyType: entry.dutyType ?? entry.duty_type ?? "NUMUNE",
    dutyAssigneeIds: (entry.dutyAssigneeIds ?? entry.duty_assignee_ids ?? []).map((v: any) => Number(v)),
    performedAt: entry.performedAt ?? entry.performed_at ?? undefined,
    inspectedAt: entry.inspectedAt ?? entry.inspected_at ?? undefined,
    sampleNotCompleted: entry.sampleNotCompleted ?? entry.sample_not_completed ?? undefined,
    inspectionNotCompleted: entry.inspectionNotCompleted ?? entry.inspection_not_completed ?? undefined,
    trackingCode: entry.trackingCode ?? entry.tracking_code ?? undefined,
    lodgingPaymentAmount: entry.lodgingPaymentAmount ?? entry.lodging_payment_amount ?? undefined,
    transportExpense: entry.transportExpense ?? entry.transport_expense ?? undefined,
    mealLunchExpense: entry.mealLunchExpense ?? entry.meal_lunch_expense ?? undefined,
    mealDinnerExpense: entry.mealDinnerExpense ?? entry.meal_dinner_expense ?? undefined,
    companyExpense: entry.companyExpense ?? entry.company_expense ?? undefined
  };
};

const mapTripCompletion = (tripId: number, data: any): TripCompletion | null => {
  if (!data) return null;
  const completionRow = data.completion ?? {};
  const entries = Array.isArray(data.entries) ? data.entries : [];
  return {
    tripId,
    completedByEmployeeIds: (
      completionRow.completedByEmployeeIds ?? completionRow.completed_by_employee_ids ?? []
    ).map((v: any) => Number(v)),
    transportMode: completionRow.transportMode ?? completionRow.transport_mode ?? "BUS",
    vehiclePlate: completionRow.vehiclePlate ?? completionRow.vehicle_plate ?? undefined,
    totalKm: completionRow.totalKm ?? completionRow.total_km ?? undefined,
    totalDays: completionRow.totalDays ?? completionRow.total_days ?? undefined,
    lodgingProvider: completionRow.lodgingProvider ?? completionRow.lodging_provider ?? undefined,
    entries: entries.map(mapEntry),
    createdAt: completionRow.createdAt ?? completionRow.created_at
  };
};

export const tripCompletionQueryKey = (tripId: number) => ["trip-completion", tripId];

export const fetchTripCompletion = async (tripId: number) => {
  const data = await apiFetch<any>(`/trips/${tripId}/completion`);
  return mapTripCompletion(tripId, data);
};

export const useTripCompletionQuery = (tripId: number, enabled = true) =>
  useQuery<TripCompletion | null>({
    queryKey: tripCompletionQueryKey(tripId),
    queryFn: () => fetchTripCompletion(tripId),
    enabled,
    staleTime: 60_000
  });
