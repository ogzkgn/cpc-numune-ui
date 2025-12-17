import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "../lib/apiClient";
import type { Trip, TripItem, TripDutyAssignment } from "../types";

const mapApiTrip = (row: any): Trip => ({
  id: row.id,
  name: row.name ?? undefined,
  plannedAt: row.plannedAt ?? row.planned_at ?? undefined,
  status: row.status ?? "ACTIVE",
  assigneeIds: (row.assigneeIds ?? row.assignee_ids ?? []).map((v: any) => Number(v)),
  notes: row.notes ?? undefined,
  plannedBy: row.plannedBy ?? row.planned_by ?? undefined,
  transportMode: row.transportMode ?? row.transport_mode ?? undefined,
  vehiclePlate: row.vehiclePlate ?? row.vehicle_plate ?? undefined,
  lodgingProvider: row.lodgingProvider ?? row.lodging_provider ?? undefined,
  dutyAssignments: {}
});

export const mapApiTripItem = (row: any): TripItem => ({
  id: Number(row.id),
  tripId: Number(row.trip_id ?? row.tripId),
  companyProductId: Number(row.company_product_id ?? row.companyProductId),
  dutyType: row.duty_type ?? row.dutyType ?? "NUMUNE",
  dutyAssigneeIds: (row.duty_assignee_ids ?? row.dutyAssigneeIds ?? []).map((v: any) => Number(v)),
  sampled: row.sampled ?? false,
  sampledAt: row.sampled_at ?? row.sampledAt,
  labStatus: row.lab_status ?? row.labStatus,
  labSentAt: row.lab_sent_at ?? row.labSentAt,
  labShipmentDetails: row.lab_shipment_details ?? row.labShipmentDetails,
  labAssignedLabId: (() => {
    const val = row.lab_assigned_lab_id ?? row.labAssignedLabId;
    return val !== undefined && val !== null ? Number(val) : undefined;
  })(),
  labEntryCode: row.lab_entry_code ?? row.labEntryCode
});

const buildDutyAssignments = (duties: any[]): Record<number, TripDutyAssignment> => {
  const map: Record<number, TripDutyAssignment> = {};
  duties.forEach((duty) => {
    const companyProductId = duty.companyProductId ?? duty.company_product_id;
    if (!companyProductId) return;
    map[companyProductId] = {
      dutyType: duty.dutyType ?? duty.duty_type ?? "NUMUNE",
      dutyAssigneeIds: (duty.dutyAssigneeIds ?? duty.duty_assignee_ids ?? []).map((v: any) => Number(v))
    };
  });
  return map;
};

const buildTripItemsFromDuties = (tripId: number, duties: any[], generate: () => number): TripItem[] =>
  duties
    .map((duty) => {
      const companyProductId = duty.companyProductId ?? duty.company_product_id;
      if (!companyProductId) return null;
      return {
        id: duty.id ?? duty.itemId ?? generate(),
        tripId,
        companyProductId: Number(companyProductId),
        dutyType: duty.dutyType ?? duty.duty_type ?? "NUMUNE",
        dutyAssigneeIds: (duty.dutyAssigneeIds ?? duty.duty_assignee_ids ?? []).map((v: any) => Number(v)),
        sampled: false
      } as TripItem;
    })
    .filter((item): item is TripItem => Boolean(item));

export const tripsQueryKey = ["trips"];
export const scopedTripsQueryKey = (roleKey = "any") => [...tripsQueryKey, roleKey];

export const fetchTrips = async () => {
  const data = await apiFetch<any[]>("/trips");
  const mappedTrips: Trip[] = [];
  const mappedTripItems: TripItem[] = [];

  data.forEach((row) => {
    const duties = Array.isArray(row.duties) ? row.duties : [];
    const items = Array.isArray(row.items) ? row.items : [];
    const trip = mapApiTrip(row);
    trip.dutyAssignments = buildDutyAssignments(duties);
    mappedTrips.push(trip);
    if (items.length > 0) {
      mappedTripItems.push(...items.map((item: any) => mapApiTripItem(item)));
    } else {
      mappedTripItems.push(...buildTripItemsFromDuties(trip.id, duties, () => Math.floor(Date.now() + Math.random() * 1000)));
    }
  });

  return { trips: mappedTrips, tripItems: mappedTripItems };
};

export const useTripsQuery = (enabled = true, roleKey = "any") =>
  useQuery({
    queryKey: scopedTripsQueryKey(roleKey),
    queryFn: fetchTrips,
    staleTime: 60_000,
    enabled
  });
