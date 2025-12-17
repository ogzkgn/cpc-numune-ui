import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "../lib/apiClient";
import { pendingSamplesQueryKey } from "./usePendingSamplesQuery";
import { tripCompletionQueryKey } from "./useTripCompletionQuery";
import { tripsQueryKey } from "./useTripsQuery";

type CreateTripInput = {
  name?: string;
  plannedAt?: string;
  notes?: string;
  plannedBy?: string;
  companyProductIds: number[];
  assigneeIds: number[];
  status?: string;
  duties?: Array<{
    companyProductId: number;
    dutyType?: string;
    dutyAssigneeIds?: number[];
  }>;
  transportMode?: string;
  vehiclePlate?: string;
  lodgingProvider?: string;
};

export const useCreateTripMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTripInput) =>
      apiFetch("/trips", {
        method: "POST",
        body: {
          name: input.name,
          planned_at: input.plannedAt,
          notes: input.notes,
          planned_by: input.plannedBy,
          company_product_ids: input.companyProductIds,
          assignee_ids: input.assigneeIds,
          status: input.status ?? "ACTIVE",
          duties: input.duties?.map((duty) => ({
            company_product_id: duty.companyProductId,
            duty_type: duty.dutyType,
            duty_assignee_ids: duty.dutyAssigneeIds
          })),
          transport_mode: input.transportMode,
          vehicle_plate: input.vehiclePlate,
          lodging_provider: input.lodgingProvider
        }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tripsQueryKey }).catch(() => {});
      queryClient.invalidateQueries({ queryKey: pendingSamplesQueryKey }).catch(() => {});
    }
  });
};

export const useUpdateTripStatusMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { tripId: number; status: string }) =>
      apiFetch(`/trips/${vars.tripId}/status`, {
        method: "PATCH",
        body: { status: vars.status }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tripsQueryKey }).catch(() => {});
    }
  });
};

export const useUpdateTripMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { tripId: number; name?: string; plannedAt?: string; notes?: string }) =>
      apiFetch(`/trips/${vars.tripId}`, {
        method: "PATCH",
        body: {
          name: vars.name,
          planned_at: vars.plannedAt,
          notes: vars.notes
        }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tripsQueryKey }).catch(() => {});
    }
  });
};

export const useUpdateTripItemLabStatusMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { tripItemId: number; status: string }) =>
      apiFetch(`/lab-forms/${vars.tripItemId}`, {
        method: "PUT",
        body: {
          status: vars.status
        }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tripsQueryKey }).catch(() => {});
      queryClient.invalidateQueries({ queryKey: pendingSamplesQueryKey }).catch(() => {});
    }
  });
};

export const useUpsertLabShipmentMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      tripItemId: number;
      labId: number;
      labEntryCode: string;
      sentAt?: string;
      sealNo: string;
      weight?: string;
      cpcNote?: string;
      labStatus?: string;
    }) => {
      const weightNumber =
        vars.weight && vars.weight.trim().length > 0 ? Number(vars.weight) : undefined;
      const normalizedWeight = Number.isFinite(weightNumber) ? weightNumber : undefined;

      return apiFetch(`/lab-shipments/${vars.tripItemId}`, {
        method: "PUT",
        body: {
          lab_id: vars.labId,
          lab_entry_code: vars.labEntryCode,
          sent_at: vars.sentAt,
          seal_no: vars.sealNo,
          weight: normalizedWeight,
          cpc_note: vars.cpcNote,
          lab_status: vars.labStatus
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tripsQueryKey }).catch(() => {});
      queryClient.invalidateQueries({ queryKey: pendingSamplesQueryKey }).catch(() => {});
    }
  });
};

export type CompleteTripEntryInput = {
  tripItemId: number;
  companyProductId: number;
  dutyType: string;
  dutyAssigneeIds: number[];
  performedAt?: string;
  inspectedAt?: string;
  sampleNotCompleted?: boolean;
  inspectionNotCompleted?: boolean;
  trackingCode?: string;
  lodgingPaymentAmount?: number;
  transportExpense?: number;
  mealLunchExpense?: number;
  mealDinnerExpense?: number;
  companyExpense?: number;
};

type CompleteTripInput = {
  tripId: number;
  completedByEmployeeIds: number[];
  transportMode: string;
  vehiclePlate?: string;
  totalKm?: number;
  totalDays?: number;
  lodgingProvider?: string;
  entries: CompleteTripEntryInput[];
};

export const useCompleteTripMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CompleteTripInput) =>
      apiFetch(`/trips/${input.tripId}/completion`, {
        method: "PUT",
        body: {
          completed_by_employee_ids: input.completedByEmployeeIds,
          transport_mode: input.transportMode,
          vehicle_plate: input.vehiclePlate,
          total_km: input.totalKm,
          total_days: input.totalDays,
          lodging_provider: input.lodgingProvider,
          entries: input.entries.map((entry) => ({
            trip_item_id: entry.tripItemId,
            company_product_id: entry.companyProductId,
            duty_type: entry.dutyType,
            duty_assignee_ids: entry.dutyAssigneeIds,
            performed_at: entry.performedAt,
            inspected_at: entry.inspectedAt,
            sample_not_completed: entry.sampleNotCompleted,
            inspection_not_completed: entry.inspectionNotCompleted,
            tracking_code: entry.trackingCode,
            lodging_payment_amount: entry.lodgingPaymentAmount,
            transport_expense: entry.transportExpense,
            meal_lunch_expense: entry.mealLunchExpense,
            meal_dinner_expense: entry.mealDinnerExpense,
            company_expense: entry.companyExpense
          }))
        }
      }),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: tripsQueryKey }).catch(() => {});
      queryClient.invalidateQueries({ queryKey: tripCompletionQueryKey(vars.tripId) }).catch(() => {});
    }
  });
};

export const useMarkSamplesTakenMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { tripItemId: number; sampledAt: string }[]) =>
      apiFetch("/trip-items/sampled", {
        method: "POST",
        body: {
          items: payload.map((item) => ({
            trip_item_id: item.tripItemId,
            sampled_at: item.sampledAt
          }))
        }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tripsQueryKey }).catch(() => {});
      queryClient.invalidateQueries({ queryKey: pendingSamplesQueryKey }).catch(() => {});
    }
  });
};
