import { create } from "zustand";

import {
  companies as mockCompanies,
  companyProducts as mockCompanyProducts,
  companyProductRecords as mockCompanyProductRecords,
  employees as mockEmployees,
  labs as mockLabs,
  sites as mockSites,
  tripCompletions as mockTripCompletions,
  tripItems as mockTripItems,
  trips as mockTrips
} from "../data/mockData";
import { generateLabEntryCode } from "../utils/samples";
import type {
  Company,
  CompanyProduct,
  CompanyProductRecord,
  CompanyProductStatus,
  ConfigurableCycle,
  Employee,
  EmployeeStatus,
  TripDutyAssignment,
  Lab,
  LabForm,
  LabFormDocument,
  LabShipmentDetails,
  LodgingProvider,
  Product,
  ToastMessage,
  TransportMode,
  Trip,
  TripCompletion,
  TripCompletionEntry,
  TripDutyType,
  TripItem,
  TripItemLabStatus,
  PaymentStatus,
  ProductType,
  TripStatus
} from "../types";

export type UserRole = "admin" | "lab";

type SampleTakenInput = {
  tripItemId: number;
  sampledAt: string;
};

type PlannerDutyConfig = {
  companyProductId: number;
  dutyType: TripDutyType;
  dutyAssigneeIds: number[];
};

type PendingSample = {
  tripId: number;
  tripItemId: number;
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

type CreateTripInput = {
  name?: string;
  plannedAt?: string;
  notes?: string;
  plannedBy?: string;
  companyProductIds: number[];
  assigneeIds: number[];
  status?: TripStatus;
  duties?: PlannerDutyConfig[];
  transportMode?: TransportMode;
  vehiclePlate?: string;
  lodgingProvider?: LodgingProvider;
};

type UpdateCompanyProductInput = Partial<Omit<CompanyProduct, "id">> & {
  id: number;
};

type CreateCompanyProductInput = {
  companyId: number;
  productId: number;
  siteId?: number;
  productCode?: string;
  certificateNo?: string;
  certificateDate?: string;
  lastSampleDate?: string;
  lastInspectionDate?: string;
  status?: CompanyProductStatus;
  paymentStatus?: PaymentStatus;
};

type CreateProductInput = {
  name: string;
  productType: ProductType;
  standardNo?: string;
  groupName?: string;
  requiresSampling?: boolean;
  samplingIntervalMonths?: number;
  labReturnDays?: number;
};

type UpsertLabFormInput = {
  tripItemId: number;
  standardNo?: string;
  data: Record<string, unknown>;
  status: LabForm["status"];
  labNotes?: string;
  cpcNotes?: string;
  documents?: LabFormDocument[];
};

type CompleteTripInput = Omit<TripCompletion, "createdAt">;

interface TripPlannerState {
  open: boolean;
  selectedCompanyProductIds: number[];
}

const getCompanyProductRecordKey = (record: CompanyProductRecord) =>
  `${record.companyName}__${record.productId ?? record.productType}__${record.productCode ?? record.standard ?? ""}`;

const mapApiProduct = (row: any): Product => ({
  id: row.id,
  name: row.name,
  productType: row.product_type ?? row.productType,
  requiresSampling: row.requires_sampling ?? row.requiresSampling,
  samplingIntervalMonths: row.sampling_interval_months ?? row.samplingIntervalMonths,
  labReturnDays: row.lab_return_days ?? row.labReturnDays,
  standardNo: row.standard_no ?? row.standardNo,
  isCustom: row.isCustom ?? true,
  groupName: row.groupName ?? row.group_name
});

const mapApiCompanyProductRecord = (row: any): CompanyProductRecord => ({
  id: row.id !== undefined ? Number(row.id) : undefined,
  productType: row.product_type ?? row.productType,
  productCode: row.product_code ?? row.productCode,
  btCode: row.bt_code ?? row.btCode,
  code: row.code,
  companyName: row.company_name ?? row.companyName,
  location: row.location,
  lastSampleDate: row.last_sample_date ?? row.lastSampleDate,
  lastInspectionDate: row.last_inspection_date ?? row.lastInspectionDate,
  paymentStatus: row.payment_status ?? row.paymentStatus,
  certificateDate: row.certificate_date ?? row.certificateDate,
  standard: row.standard_no ?? row.standard,
  productName: row.product_name ?? row.productName,
  status: row.status ?? "devam",
  productId: row.product_id ?? row.productId,
  requiresSampling: row.requires_sampling ?? row.requiresSampling,
  samplingIntervalMonths: row.sampling_interval_months ?? row.samplingIntervalMonths,
  labReturnDays: row.lab_return_days ?? row.labReturnDays
});

const mapApiEmployee = (row: any): Employee => ({
  id: Number(row.id),
  name: row.name,
  city: row.city ?? undefined,
  status: (row.status ?? "available") as EmployeeStatus,
  skills: Array.isArray(row.skills) ? row.skills : []
});

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

const mapApiTripItem = (row: any): TripItem => ({
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
  labAssignedLabId: row.lab_assigned_lab_id ?? row.labAssignedLabId,
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

interface AppState {
  companies: Company[];
  products: Product[];
  companyProducts: CompanyProduct[];
  companyProductRecords: CompanyProductRecord[];
  labs: Lab[];
  employees: Employee[];
  trips: Trip[];
  tripItems: TripItem[];
  labForms: LabForm[];
  tripCompletions: TripCompletion[];
  pendingSamples: PendingSample[];
  samplingCycles: ConfigurableCycle[];
  toasts: ToastMessage[];
  activeRole: UserRole;
  tripPlanner: TripPlannerState;
  loadProducts: () => Promise<void>;
  loadTrips: () => Promise<void>;
  loadPendingSamples: () => Promise<void>;
  loadTripCompletion: (tripId: number) => Promise<void>;
  loadEmployees: () => Promise<void>;
  loadCompanyProductRecords: () => Promise<void>;
  addProduct: (input: CreateProductInput) => Promise<void>;
  deleteProduct: (id: number) => Promise<void>;
  addEmployee: (input: Omit<Employee, "id" | "status"> & { status?: EmployeeStatus }) => Promise<void>;
  updateEmployee: (id: number, changes: Partial<Omit<Employee, "id">>) => Promise<void>;
  deleteEmployee: (id: number) => Promise<void>;
  setActiveRole: (role: UserRole) => void;
  addToast: (toast: Omit<ToastMessage, "id"> & { id?: string }) => void;
  removeToast: (id: string) => void;
  openTripPlanner: (companyProductIds: number[]) => void;
  closeTripPlanner: () => void;
  createTrip: (payload: CreateTripInput) => Promise<void>;
  updateTripStatus: (tripId: number, status: TripStatus) => void;
  updateTrip: (tripId: number, changes: Partial<Pick<Trip, "name" | "plannedAt" | "notes">>) => void;
  markSampleTaken: (inputs: SampleTakenInput[]) => void;
  addCompanyProduct: (input: CreateCompanyProductInput) => void;
  addCompanyProductRecord: (input: CompanyProductRecord) => Promise<void>;
  deleteCompanyProductRecord: (key: string, id?: number) => Promise<void>;
  updateCompanyProductRecord: (key: string, changes: Partial<CompanyProductRecord>) => Promise<void>;
  setCompanyProductRecordStatus: (key: string, status: CompanyProductStatus) => void;
  updateTripItemLabStatus: (
    tripItemId: number,
    status: TripItemLabStatus,
    options?: { sentAt?: string; shipment?: LabShipmentDetails; labId?: number; labEntryCode?: string }
  ) => Promise<void>;
  upsertLabForm: (input: UpsertLabFormInput) => void;
  updateCompanyProduct: (input: UpdateCompanyProductInput) => void;
  setCompanyProductStatus: (companyProductId: number, status: CompanyProduct["status"]) => void;
  setSamplingCycle: (productType: ConfigurableCycle["productType"], months: number) => void;
  completeTrip: (input: CompleteTripInput) => Promise<void>;
}

const cloneData = <T>(items: T[]): T[] => items.map((item) => ({ ...item }));

const recalcEmployeeStatuses = (employees: Employee[], trips: Trip[]): Employee[] => {
  const busyIds = new Set<number>();
  trips
    .filter((trip) => trip.status === "ACTIVE" || trip.status === "PLANNED")
    .forEach((trip) => {
      trip.assigneeIds.forEach((id) => busyIds.add(id));
    });

  return employees.map((emp) => ({
    ...emp,
    status: busyIds.has(emp.id) ? "busy" : "available"
  }));
};

const generateId = () => Math.floor(Date.now() + Math.random() * 1000);

export const useAppStore = create<AppState>((set, get) => ({
  companies: cloneData(mockCompanies),
  sites: cloneData(mockSites),
  products: [],
  companyProducts: cloneData(mockCompanyProducts),
  companyProductRecords: cloneData(mockCompanyProductRecords),
  labs: cloneData(mockLabs),
  employees: [],
  trips: [],
  tripItems: [],
  labForms: [],
  tripCompletions: [],
  pendingSamples: [],
  samplingCycles: [],
  toasts: [],
  activeRole: "admin",
  tripPlanner: {
    open: false,
    selectedCompanyProductIds: []
  },

  loadProducts: async () => {
    try {
      const baseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
      const response = await fetch(`${baseUrl}/products`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = (await response.json()) as any[];
      set({ products: data.map((item) => mapApiProduct(item)) });
    } catch (error) {
      console.error("Ürünler yüklenemedi, boş liste kullanılacak.", error);
      set({ products: [] });
    }
  },

  loadTrips: async () => {
    try {
      const baseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
      const response = await fetch(`${baseUrl}/trips`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = (await response.json()) as any[];
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
          mappedTripItems.push(...buildTripItemsFromDuties(trip.id, duties, generateId));
        }
      });

      set((state) => ({
        trips: mappedTrips,
        tripItems: mappedTripItems,
        employees: recalcEmployeeStatuses(state.employees, mappedTrips)
      }));
    } catch (error) {
      console.error("Seyahatler yüklenemedi, lokal veriler kullanılacak.", error);
    }
  },

  loadPendingSamples: async () => {
    try {
      const baseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
      const response = await fetch(`${baseUrl}/lab-shipments/pending`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = (await response.json()) as any[];
      set({
        pendingSamples: data.map((row) => ({
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
        }))
      });
    } catch (error) {
      console.error("Pending lab samples fetch failed.", error);
      set({ pendingSamples: [] });
    }
  },

  loadTripCompletion: async (tripId: number) => {
    try {
      const baseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
      const response = await fetch(`${baseUrl}/trips/${tripId}/completion`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!data) return;
      const completionRow = data.completion ?? {};
      const entries = Array.isArray(data.entries) ? data.entries : [];
      const mappedCompletion: TripCompletion = {
        tripId,
        completedByEmployeeIds: (
          completionRow.completedByEmployeeIds ?? completionRow.completed_by_employee_ids ?? []
        ).map((v: any) => Number(v)),
        transportMode: completionRow.transportMode ?? completionRow.transport_mode ?? "BUS",
        vehiclePlate: completionRow.vehiclePlate ?? completionRow.vehicle_plate ?? undefined,
        totalKm: completionRow.totalKm ?? completionRow.total_km ?? undefined,
        totalDays: completionRow.totalDays ?? completionRow.total_days ?? undefined,
        lodgingProvider: completionRow.lodgingProvider ?? completionRow.lodging_provider ?? undefined,
        entries: entries.map((entry: any) => ({
          tripItemId: Number(entry.tripItemId ?? entry.trip_item_id ?? entry.company_product_id),
          companyProductId: Number(entry.company_product_id ?? entry.companyProductId ?? entry.tripItemId ?? entry.trip_item_id),
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
        })),
        createdAt: completionRow.createdAt ?? completionRow.created_at
      };

      set((state) => ({
        tripCompletions: [
          ...state.tripCompletions.filter((tc) => tc.tripId !== tripId),
          mappedCompletion
        ]
      }));
    } catch (error) {
      console.error("Trip completion fetch failed", error);
    }
  },

  loadEmployees: async () => {
    try {
      const baseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
      const response = await fetch(`${baseUrl}/employees`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = (await response.json()) as any[];
      set((state) => ({
        employees: recalcEmployeeStatuses(data.map((item) => mapApiEmployee(item)), state.trips)
      }));
    } catch (error) {
      console.error("Ekip listesi yüklenemedi, boş liste kullanılacak.", error);
      set((state) => ({ employees: recalcEmployeeStatuses([], state.trips) }));
    }
  },

  loadCompanyProductRecords: async () => {
    try {
      const baseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
      const response = await fetch(`${baseUrl}/company-products`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = (await response.json()) as any[];
      set({ companyProductRecords: data.map((item) => mapApiCompanyProductRecord(item)) });
    } catch (error) {
      console.error("Firma-ürün kayıtları yüklenemedi, boş liste kullanılacak.", error);
      set({ companyProductRecords: [] });
    }
  },

  addProduct: async (input) => {
    try {
      const baseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
      const response = await fetch(`${baseUrl}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: input.name,
          product_type: input.productType,
          requires_sampling: input.requiresSampling ?? false,
          sampling_interval_months: input.samplingIntervalMonths,
          lab_return_days: input.labReturnDays,
          standard_no: input.standardNo
        })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const created = mapApiProduct(await response.json());
      set((state) => ({ products: [...state.products, created] }));
    } catch (error) {
      console.error("Ürün eklenemedi, lokal ekleme yapılıyor.", error);
      set((state) => ({
        products: [
          ...state.products,
          {
            id: generateId(),
            ...input,
            isCustom: true
          }
        ]
      }));
    }
  },

  deleteProduct: async (id) => {
    try {
      const baseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
      const response = await fetch(`${baseUrl}/products/${id}`, {
        method: "DELETE"
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      console.error("Ürün silme API isteği başarısız, lokal silinecek.", error);
    } finally {
      set((state) => ({
        products: state.products.filter((product) => product.id !== id)
      }));
    }
  },

  addEmployee: async (input) => {
    const payload = {
      name: input.name,
      city: input.city,
      status: input.status ?? "available",
      skills: input.skills ?? []
    };

    try {
      const baseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
      const response = await fetch(`${baseUrl}/employees`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const created = mapApiEmployee(await response.json());
      set((state) => ({
        employees: recalcEmployeeStatuses([...state.employees, created], state.trips)
      }));
    } catch (error) {
      console.error("Ekip eklenemedi, lokal ekleme yapılıyor.", error);
      set((state) => ({
        employees: recalcEmployeeStatuses(
          [
            ...state.employees,
            {
              id: generateId(),
              ...payload
            }
          ],
          state.trips
        )
      }));
    }
  },

  updateEmployee: async (id, changes) => {
    let updated: Employee | undefined;
    try {
      const baseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
      const response = await fetch(`${baseUrl}/employees/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: changes.name,
          city: changes.city,
          status: changes.status ?? "available",
          skills: changes.skills ?? []
        })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      updated = mapApiEmployee(await response.json());
    } catch (error) {
      console.error("Ekip güncelleme API isteği başarısız, lokal güncellenecek.", error);
    } finally {
      set((state) => ({
        employees: recalcEmployeeStatuses(
          state.employees.map((emp) => (emp.id === id ? { ...emp, ...changes, ...(updated ?? {}) } : emp)),
          state.trips
        )
      }));
    }
  },

  deleteEmployee: async (id) => {
    try {
      const baseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
      const response = await fetch(`${baseUrl}/employees/${id}`, {
        method: "DELETE"
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      console.error("Ekip silme API isteği başarısız, lokal silinecek.", error);
    } finally {
      set((state) => ({
        employees: recalcEmployeeStatuses(state.employees.filter((emp) => emp.id !== id), state.trips)
      }));
    }
  },

  setActiveRole: (role) => set({ activeRole: role }),

  addToast: ({ id, ...toast }) =>
    set((state) => ({
      toasts: [
        ...state.toasts,
        {
          id: id ?? crypto.randomUUID(),
          ...toast
        }
      ]
    })),

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id)
    })),

  openTripPlanner: (companyProductIds) =>
    set(() => ({
      tripPlanner: {
        open: true,
        selectedCompanyProductIds: companyProductIds
      }
    })),

  closeTripPlanner: () =>
    set(() => ({
      tripPlanner: {
        open: false,
        selectedCompanyProductIds: []
      }
    })),

  createTrip: async ({
    name,
    plannedAt,
    notes,
    plannedBy,
    companyProductIds,
    assigneeIds,
    duties,
    status = "ACTIVE",
    transportMode,
    vehiclePlate,
    lodgingProvider
  }: CreateTripInput) => {
    const now = new Date().toISOString();
    const dutyAssignments: Trip["dutyAssignments"] = {};
    const dutyMap = new Map<number, PlannerDutyConfig>();
    duties?.forEach((entry) => dutyMap.set(entry.companyProductId, entry));

    companyProductIds.forEach((companyProductId) => {
      const config = dutyMap.get(companyProductId);
      dutyAssignments[companyProductId] = {
        dutyType: config?.dutyType ?? "NUMUNE",
        dutyAssigneeIds:
          config?.dutyAssigneeIds && config.dutyAssigneeIds.length > 0
            ? [...config.dutyAssigneeIds]
            : [...assigneeIds]
      };
    });

    try {
      const baseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
      const response = await fetch(`${baseUrl}/trips`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          planned_at: plannedAt ?? now,
          status,
          assignee_ids: assigneeIds,
          notes,
          planned_by: plannedBy,
          transport_mode: transportMode,
          vehicle_plate: vehiclePlate,
          lodging_provider: lodgingProvider,
          duties: companyProductIds.map((companyProductId) => ({
            company_product_id: companyProductId,
            duty_type: dutyAssignments[companyProductId]?.dutyType ?? "NUMUNE",
            duty_assignee_ids: dutyAssignments[companyProductId]?.dutyAssigneeIds ?? [...assigneeIds]
          }))
        })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      const apiTrip = mapApiTrip(payload.trip);
      apiTrip.dutyAssignments = buildDutyAssignments(payload.duties ?? []);
      const tripItemsFromApi: TripItem[] = Array.isArray(payload.items)
        ? payload.items.map((item: any) => mapApiTripItem(item))
        : buildTripItemsFromDuties(apiTrip.id, payload.duties ?? [], generateId);

      set((state) => {
        const updatedTrips = [...state.trips, apiTrip];
        const updatedTripItems = [...state.tripItems, ...tripItemsFromApi];
        const updatedEmployees = recalcEmployeeStatuses(state.employees, updatedTrips);
        return {
          trips: updatedTrips,
          tripItems: updatedTripItems,
          employees: updatedEmployees,
          tripPlanner: { open: false, selectedCompanyProductIds: [] }
        };
      });
    } catch (error) {
      console.error("Seyahat API ile oluşturulamadı, lokal ekleme yapılıyor.", error);
      const fallbackId = generateId();
      const newTrip: Trip = {
        id: fallbackId,
        name,
        plannedAt: plannedAt ?? now,
        status,
        assigneeIds,
        notes,
        plannedBy,
        transportMode,
        vehiclePlate,
        lodgingProvider,
        dutyAssignments
      };

      const newTripItems: TripItem[] = companyProductIds.map((companyProductId) => ({
        id: generateId(),
        tripId: fallbackId,
        companyProductId,
        sampled: false,
        labStatus: "PENDING",
        dutyType: dutyAssignments[companyProductId]?.dutyType ?? "NUMUNE",
        dutyAssigneeIds: dutyAssignments[companyProductId]?.dutyAssigneeIds ?? [...assigneeIds]
      }));

      set((state) => {
        const updatedTrips = [...state.trips, newTrip];
        const updatedTripItems = [...state.tripItems, ...newTripItems];
        const updatedEmployees = recalcEmployeeStatuses(state.employees, updatedTrips);
        return {
          trips: updatedTrips,
          tripItems: updatedTripItems,
          employees: updatedEmployees,
          tripPlanner: { open: false, selectedCompanyProductIds: [] }
        };
      });
    }
  },

  updateTripStatus: (tripId, status) => {
    set((state) => {
      const updatedTrips = state.trips.map((trip) =>
        trip.id === tripId
          ? {
              ...trip,
              status
            }
          : trip
      );

      return {
        trips: updatedTrips,
        employees: recalcEmployeeStatuses(state.employees, updatedTrips)
      };
    });
  },

  updateTrip: (tripId, changes) => {
    set((state) => ({
      trips: state.trips.map((trip) =>
        trip.id === tripId
          ? {
              ...trip,
              ...changes
            }
          : trip
      )
    }));
  },

  markSampleTaken: (inputs) => {
    if (!inputs.length) return;

    set((state) => {
      const entryMap = new Map<number, string>();
      const companyProductUpdates = new Map<number, string>();

      inputs.forEach((item) => {
        entryMap.set(item.tripItemId, item.sampledAt);
        const relatedItem = state.tripItems.find((ti) => ti.id === item.tripItemId);
        if (relatedItem) {
          companyProductUpdates.set(relatedItem.companyProductId, item.sampledAt);
        }
      });

      const updatedTripItems = state.tripItems.map((item) => {
        if (!entryMap.has(item.id)) return item;
        return {
          ...item,
          sampled: true,
          sampledAt: entryMap.get(item.id) ?? item.sampledAt
        };
      });

      const updatedCompanyProducts = state.companyProducts.map((companyProduct) => {
        if (!companyProductUpdates.has(companyProduct.id)) {
          return companyProduct;
        }
        return {
          ...companyProduct,
          lastSampleDate: companyProductUpdates.get(companyProduct.id) ?? companyProduct.lastSampleDate
        };
      });

      return {
        tripItems: updatedTripItems,
        companyProducts: updatedCompanyProducts
      };
    });
  },

  addCompanyProduct: (input) => {
    set((state) => {
      const id = generateId();
      const newProduct: CompanyProduct = {
        id,
        companyId: input.companyId,
        productId: input.productId,
        siteId: input.siteId,
        productCode: input.productCode,
        certificateNo: input.certificateNo,
        certificateDate: input.certificateDate,
        lastSampleDate: input.lastSampleDate,
        lastInspectionDate: input.lastInspectionDate,
        status: input.status ?? "devam",
        paymentStatus: input.paymentStatus
      };

      return {
        companyProducts: [...state.companyProducts, newProduct]
      };
    });
  },

  updateTripItemLabStatus: async (tripItemId, status, options) => {
    let updatedTripItem: TripItem | undefined;
    const baseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

    // Persist lab submission when all required fields are provided
    if (status === "SUBMITTED" && options?.labId && options?.shipment && options?.labEntryCode) {
      try {
        const seal = options.shipment.sealNo.trim();
        const weightStr = options.shipment.weight?.toString().trim() ?? "";
        const response = await fetch(`${baseUrl}/lab-shipments/${tripItemId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lab_id: options.labId,
            lab_entry_code: options.labEntryCode,
            sent_at: options.sentAt ?? new Date().toISOString(),
            seal_no: seal,
            weight: weightStr ? Number(weightStr) : null,
            cpc_note: options.shipment.cpcNote,
            lab_status: status
          })
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        if (data?.tripItem) {
          updatedTripItem = mapApiTripItem(data.tripItem);
        }
      } catch (error) {
        console.error("Lab shipment API call failed, falling back to local update.", error);
      }
    }

    set((state) => ({
      tripItems: state.tripItems.map((item) =>
        item.id === tripItemId
          ? {
              ...item,
              labStatus: status,
              ...(options?.sentAt ? { labSentAt: options.sentAt } : {}),
              ...(options?.shipment ? { labShipmentDetails: { ...options.shipment } } : {}),
              ...(options?.labId !== undefined ? { labAssignedLabId: options.labId } : {}),
              ...(options?.labEntryCode ? { labEntryCode: options.labEntryCode } : {}),
              ...(updatedTripItem ? updatedTripItem : {})
            }
          : item
      ),
      pendingSamples: state.pendingSamples.filter((row) => row.tripItemId !== tripItemId)
    }));
  },

  addCompanyProductRecord: async (input) => {
    try {
      const baseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
      const response = await fetch(`${baseUrl}/company-products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: input.companyName,
          product_name: input.productName,
          product_type: input.productType,
          product_id: input.productId,
          bt_code: input.btCode,
          code: input.code,
          product_code: input.productCode,
          location: input.location,
          certificate_date: input.certificateDate,
          last_sample_date: input.lastSampleDate,
          last_inspection_date: input.lastInspectionDate,
          payment_status: input.paymentStatus,
          requires_sampling: input.requiresSampling ?? false,
          sampling_interval_months: input.samplingIntervalMonths,
          lab_return_days: input.labReturnDays,
          standard_no: input.standard,
          status: input.status ?? "devam"
        })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const created = mapApiCompanyProductRecord(await response.json());
      set((state) => ({ companyProductRecords: [...state.companyProductRecords, created] }));
    } catch (error) {
      console.error("Firma-ürün kaydı API ile eklenemedi, lokal ekleme yapılıyor.", error);
      set((state) => ({
        companyProductRecords: [
          ...state.companyProductRecords,
          {
            ...input,
            id: generateId()
          }
        ]
      }));
    }
  },

  deleteCompanyProductRecord: async (key, id) => {
    try {
      if (id) {
        const baseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
        const response = await fetch(`${baseUrl}/company-products/${id}`, {
          method: "DELETE"
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error("Firma-ürün silme API isteği başarısız, lokal silinecek.", error);
    } finally {
      set((state) => ({
        companyProductRecords: state.companyProductRecords.filter(
          (record) => getCompanyProductRecordKey(record) !== key
        )
      }));
    }
  },

  updateCompanyProductRecord: async (key, changes) => {
    let updated: CompanyProductRecord | undefined;
    try {
      if (changes.id) {
        const baseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
        const response = await fetch(`${baseUrl}/company-products/${changes.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            company_name: changes.companyName,
            product_name: changes.productName,
            product_type: changes.productType,
            product_id: changes.productId,
            bt_code: changes.btCode,
            code: changes.code,
            product_code: changes.productCode,
            location: changes.location,
            certificate_date: changes.certificateDate,
            last_sample_date: changes.lastSampleDate,
            last_inspection_date: changes.lastInspectionDate,
            payment_status: changes.paymentStatus,
            requires_sampling: changes.requiresSampling ?? false,
            sampling_interval_months: changes.samplingIntervalMonths,
            lab_return_days: changes.labReturnDays,
            standard_no: changes.standard,
            status: changes.status ?? "devam"
          })
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        updated = mapApiCompanyProductRecord(await response.json());
      }
    } catch (error) {
      console.error("Firma-ürün güncelleme API isteği başarısız, lokal güncellenecek.", error);
    } finally {
      set((state) => ({
        companyProductRecords: state.companyProductRecords.map((record) => {
          if (getCompanyProductRecordKey(record) !== key) return record;
          if (updated) return updated;
          return { ...record, ...changes };
        })
      }));
    }
  },

  setCompanyProductRecordStatus: (key, status) => {
    set((state) => ({
      companyProductRecords: state.companyProductRecords.map((record) =>
        getCompanyProductRecordKey(record) === key ? { ...record, status } : record
      )
    }));
  },

  upsertLabForm: ({ tripItemId, standardNo, data, status, labNotes, cpcNotes, documents }) => {
    set((state) => {
      const existing = state.labForms.find((form) => form.tripItemId === tripItemId);
      const timestamp = new Date().toISOString();
      let resolvedStatus: TripItemLabStatus;
      switch (status) {
        case "APPROVED":
          resolvedStatus = "ACCEPTED";
          break;
        case "WAITING_CONFIRM":
          resolvedStatus = "WAITING_CONFIRM";
          break;
        case "SUBMITTED":
          resolvedStatus = "SUBMITTED";
          break;
        case "DRAFT":
        default:
          resolvedStatus = "DRAFT";
          break;
      }

      const nextLabForms = existing
        ? state.labForms.map((form) =>
            form.tripItemId === tripItemId
              ? {
                  ...form,
                  standardNo,
                  data,
                  status,
                  updatedAt: timestamp,
                  ...(labNotes !== undefined ? { labNotes } : {}),
                  ...(cpcNotes !== undefined ? { cpcNotes } : {}),
                  ...(documents !== undefined
                    ? { documents: documents.map((doc) => ({ ...doc })) }
                    : {})
                }
              : form
          )
        : [
            ...state.labForms,
            {
              id: generateId(),
              tripItemId,
              standardNo,
              data,
              status,
              updatedAt: timestamp,
              ...(labNotes !== undefined ? { labNotes } : {}),
              ...(cpcNotes !== undefined ? { cpcNotes } : {}),
              ...(documents !== undefined
                ? { documents: documents.map((doc) => ({ ...doc })) }
                : {})
            }
          ];

      const updatedTripItems = state.tripItems.map((item) =>
        item.id === tripItemId
          ? {
              ...item,
              labStatus: resolvedStatus
            }
          : item
      );

      return {
        labForms: nextLabForms,
        tripItems: updatedTripItems
      };
    });
  },

  updateCompanyProduct: ({ id, ...changes }) => {
    set((state) => ({
      companyProducts: state.companyProducts.map((cp) =>
        cp.id === id
          ? {
              ...cp,
              ...changes
            }
          : cp
      )
    }));
  },

  setCompanyProductStatus: (companyProductId, status) => {
    set((state) => ({
      companyProducts: state.companyProducts.map((cp) =>
        cp.id === companyProductId
          ? {
              ...cp,
              status
            }
          : cp
      )
    }));
  },

  setSamplingCycle: (productType, months) => {
    set((state) => ({
      samplingCycles: state.samplingCycles.map((cycle) =>
        cycle.productType === productType
          ? {
              ...cycle,
              months
            }
          : cycle
      )
    }));
  },

  completeTrip: async (input) => {
    const state = get();
    const timestamp = new Date().toISOString();
    const baseTripItems = state.tripItems;
    const trip = state.trips.find((entry) => entry.id === input.tripId);

    const trackingCodeUpdates = new Map<number, string>();
    const payloadEntries: any[] = [];
    const normalizedEntries: TripCompletionEntry[] = input.entries.map((entry) => {
      const tripItem = baseTripItems.find((item) => item.id === entry.tripItemId);
      const companyProductId =
        tripItem?.companyProductId ?? (entry as any).companyProductId ?? entry.tripItemId ?? undefined;
      const dutyAssignment = companyProductId && trip?.dutyAssignments ? trip.dutyAssignments[companyProductId] : undefined;
      const companyProduct = companyProductId
        ? state.companyProducts.find((product) => product.id === companyProductId)
        : undefined;
      const companyProductRecord = companyProductId
        ? state.companyProductRecords.find((rec) => rec.id === companyProductId)
        : undefined;
      const dutyType: TripDutyType =
        entry.dutyType ?? tripItem?.dutyType ?? dutyAssignment?.dutyType ?? "NUMUNE";
      const dutyAssigneeIds =
        entry.dutyAssigneeIds && entry.dutyAssigneeIds.length > 0
          ? entry.dutyAssigneeIds
          : tripItem?.dutyAssigneeIds?.length
            ? tripItem.dutyAssigneeIds
            : dutyAssignment?.dutyAssigneeIds ?? [];
      const requiresSample = dutyType === "NUMUNE" || dutyType === "BOTH";

      let trackingCode = entry.trackingCode;
      if (requiresSample && !entry.sampleNotCompleted && entry.performedAt) {
        if (!trackingCode) {
          trackingCode =
            generateLabEntryCode({
              productCode: companyProduct?.productCode ?? companyProductRecord?.productCode,
              performedAt: entry.performedAt,
              tripItems: baseTripItems,
              excludeTripItemId: entry.tripItemId
            }) ?? undefined;
        }
        if (trackingCode) {
          trackingCodeUpdates.set(entry.tripItemId, trackingCode);
        }
      } else {
        trackingCode = undefined;
      }

      payloadEntries.push({
        company_product_id: companyProductId ?? null,
        duty_type: dutyType,
        duty_assignee_ids: dutyAssigneeIds,
        performed_at: entry.sampleNotCompleted ? null : entry.performedAt ?? null,
        inspected_at: entry.inspectionNotCompleted ? null : entry.inspectedAt ?? null,
        sample_not_completed: entry.sampleNotCompleted ?? null,
        inspection_not_completed: entry.inspectionNotCompleted ?? null,
        tracking_code: trackingCode ?? null,
        lodging_payment_amount: entry.lodgingPaymentAmount ?? null,
        transport_expense: entry.transportExpense ?? null,
        meal_lunch_expense: entry.mealLunchExpense ?? null,
        meal_dinner_expense: entry.mealDinnerExpense ?? null,
        company_expense: entry.companyExpense ?? null
      });

      return {
        ...entry,
        dutyType,
        dutyAssigneeIds,
        trackingCode,
        performedAt: entry.sampleNotCompleted ? undefined : entry.performedAt,
        inspectedAt: entry.inspectionNotCompleted ? undefined : entry.inspectedAt,
        sampleNotCompleted: entry.sampleNotCompleted || undefined,
        inspectionNotCompleted: entry.inspectionNotCompleted || undefined
      };
    });

    try {
      const baseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
      const response = await fetch(`${baseUrl}/trips/${input.tripId}/completion`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          completed_by_employee_ids: input.completedByEmployeeIds,
          transport_mode: trip?.transportMode ?? input.transportMode,
          vehicle_plate: trip?.vehiclePlate ?? input.vehiclePlate,
          total_km: input.totalKm ?? null,
          total_days: input.totalDays ?? null,
          lodging_provider: trip?.lodgingProvider ?? input.lodgingProvider,
          entries: payloadEntries
        })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const completion = data?.completion;
      const entries = Array.isArray(data?.entries) ? data.entries : [];

      const mappedCompletion: TripCompletion = {
        tripId: input.tripId,
        completedByEmployeeIds: completion?.completedByEmployeeIds ?? completion?.completed_by_employee_ids ?? input.completedByEmployeeIds,
        transportMode: completion?.transportMode ?? completion?.transport_mode ?? trip?.transportMode ?? input.transportMode,
        vehiclePlate: completion?.vehiclePlate ?? completion?.vehicle_plate ?? trip?.vehiclePlate ?? input.vehiclePlate,
        totalKm: completion?.totalKm ?? completion?.total_km ?? input.totalKm,
        totalDays: completion?.totalDays ?? completion?.total_days ?? input.totalDays,
        lodgingProvider: completion?.lodgingProvider ?? completion?.lodging_provider ?? trip?.lodgingProvider ?? input.lodgingProvider,
        entries: entries.map((entry: any) => {
          const companyProductId = entry.companyProductId ?? entry.company_product_id;
          const tripItemId =
            state.tripItems.find((ti) => ti.tripId === input.tripId && ti.companyProductId === companyProductId)?.id ??
            companyProductId;
          return {
            tripItemId,
            dutyType: entry.dutyType ?? entry.duty_type ?? "NUMUNE",
            dutyAssigneeIds: entry.dutyAssigneeIds ?? entry.duty_assignee_ids ?? [],
            performedAt: entry.performedAt ?? entry.performed_at ?? undefined,
            inspectedAt: entry.inspectedAt ?? entry.inspected_at ?? undefined,
            sampleNotCompleted: entry.sample_not_completed ?? entry.sampleNotCompleted ?? undefined,
            inspectionNotCompleted: entry.inspection_not_completed ?? entry.inspectionNotCompleted ?? undefined,
            trackingCode: entry.trackingCode ?? entry.tracking_code ?? undefined,
            lodgingPaymentAmount: entry.lodgingPaymentAmount ?? entry.lodging_payment_amount ?? undefined,
            transportExpense: entry.transportExpense ?? entry.transport_expense ?? undefined,
            mealLunchExpense: entry.mealLunchExpense ?? entry.meal_lunch_expense ?? undefined,
            mealDinnerExpense: entry.mealDinnerExpense ?? entry.meal_dinner_expense ?? undefined,
            companyExpense: entry.companyExpense ?? entry.company_expense ?? undefined
          };
        }),
        createdAt: completion?.createdAt ?? completion?.created_at ?? timestamp
      };

      // Local side effects similar to previous logic
      const sampleTripItemUpdates = new Map<number, string>();
      const inspectionDateUpdates = new Map<number, string>();
      mappedCompletion.entries.forEach((entry) => {
        const isSamplingDuty = entry.dutyType === "NUMUNE" || entry.dutyType === "BOTH";
        if (isSamplingDuty && entry.performedAt) {
          sampleTripItemUpdates.set(entry.tripItemId, entry.performedAt);
        }
        if (entry.dutyType === "GÖZETİM" || entry.dutyType === "BOTH") {
          const tripItem = state.tripItems.find((item) => item.id === entry.tripItemId);
          if (tripItem && entry.inspectedAt) {
            inspectionDateUpdates.set(tripItem.companyProductId, entry.inspectedAt);
          }
        }
      });

      const updatedTripItems = state.tripItems.map((item) => {
        const performedAt = sampleTripItemUpdates.get(item.id);
        const trackingCode = trackingCodeUpdates.get(item.id);
        if (!performedAt) {
          if (!trackingCode) return item;
          return { ...item, labEntryCode: trackingCode };
        }
        return {
          ...item,
          sampled: true,
          sampledAt: performedAt,
          labStatus: item.labStatus ?? "PENDING",
          ...(trackingCode ? { labEntryCode: trackingCode } : {})
        };
      });

      const companyProductDateUpdates = new Map<number, string>();
      sampleTripItemUpdates.forEach((performedAt, tripItemId) => {
        const tripItem = state.tripItems.find((item) => item.id === tripItemId);
        if (tripItem) companyProductDateUpdates.set(tripItem.companyProductId, performedAt);
      });

      const updatedCompanyProducts = state.companyProducts.map((cp) => {
        const performedAt = companyProductDateUpdates.get(cp.id);
        const inspectedAt = inspectionDateUpdates.get(cp.id);
        if (!performedAt && !inspectedAt) return cp;
        return {
          ...cp,
          ...(performedAt ? { lastSampleDate: performedAt } : {}),
          ...(inspectedAt ? { lastInspectionDate: inspectedAt } : {})
        };
      });

      const updatedTrips = state.trips.map((t) =>
        t.id === input.tripId
          ? {
              ...t,
              status: "COMPLETED" as TripStatus
            }
          : t
      );

      set(() => ({
        tripCompletions: [
          ...state.tripCompletions.filter((entry) => entry.tripId !== input.tripId),
          mappedCompletion
        ],
        trips: updatedTrips,
        tripItems: updatedTripItems,
        companyProducts: updatedCompanyProducts,
        employees: recalcEmployeeStatuses(state.employees, updatedTrips)
      }));
    } catch (error) {
      console.error("Seyahat tamamlama API isteği başarısız, lokal güncellenecek.", error);
      // fallback to previous local-only behavior
      set((localState) => {
        const baseTripItemsFallback = localState.tripItems;
        const tripFallback = localState.trips.find((entry) => entry.id === input.tripId);

        const trackingCodeUpdatesFallback = new Map<number, string>();

        const normalizedEntries: TripCompletionEntry[] = input.entries.map((entry) => {
          const tripItem = baseTripItemsFallback.find((item) => item.id === entry.tripItemId);
          const dutyAssignment =
            tripItem && tripFallback?.dutyAssignments ? tripFallback.dutyAssignments[tripItem.companyProductId] : undefined;
          const companyProduct = tripItem
            ? localState.companyProducts.find((product) => product.id === tripItem.companyProductId)
            : undefined;
          const dutyType: TripDutyType =
            entry.dutyType ?? tripItem?.dutyType ?? dutyAssignment?.dutyType ?? "NUMUNE";
          const dutyAssigneeIds =
            entry.dutyAssigneeIds && entry.dutyAssigneeIds.length > 0
              ? entry.dutyAssigneeIds
              : tripItem?.dutyAssigneeIds?.length
                ? tripItem.dutyAssigneeIds
                : dutyAssignment?.dutyAssigneeIds ?? [];
          const requiresSample = dutyType === "NUMUNE" || dutyType === "BOTH";

          let trackingCode = entry.trackingCode;
          if (requiresSample && !entry.sampleNotCompleted && entry.performedAt) {
            if (!trackingCode) {
              trackingCode =
                generateLabEntryCode({
                  productCode: companyProduct?.productCode,
                  performedAt: entry.performedAt,
                  tripItems: baseTripItemsFallback,
                  excludeTripItemId: entry.tripItemId
                }) ?? undefined;
            }
            if (trackingCode) {
              trackingCodeUpdatesFallback.set(entry.tripItemId, trackingCode);
            }
          } else {
            trackingCode = undefined;
          }

          return {
            ...entry,
            dutyType,
            dutyAssigneeIds,
            trackingCode,
            performedAt: entry.sampleNotCompleted ? undefined : entry.performedAt,
            inspectedAt: entry.inspectionNotCompleted ? undefined : entry.inspectedAt,
            sampleNotCompleted: entry.sampleNotCompleted || undefined,
            inspectionNotCompleted: entry.inspectionNotCompleted || undefined
          };
        });

        const nextCompletion: TripCompletion = {
          ...input,
          entries: normalizedEntries,
          createdAt: timestamp
        };

        const existsIndex = localState.tripCompletions.findIndex((entry) => entry.tripId === input.tripId);
        const nextTripCompletions =
          existsIndex >= 0
            ? localState.tripCompletions.map((entry, index) => (index === existsIndex ? nextCompletion : entry))
            : [...localState.tripCompletions, nextCompletion];

        const sampleTripItemUpdates = new Map<number, string>();
        const inspectionDateUpdates = new Map<number, string>();
        normalizedEntries.forEach((entry) => {
          const isSamplingDuty = entry.dutyType === "NUMUNE" || entry.dutyType === "BOTH";
          if (isSamplingDuty && entry.performedAt) {
            sampleTripItemUpdates.set(entry.tripItemId, entry.performedAt);
          }

          if (entry.dutyType === "GÖZETİM" || entry.dutyType === "BOTH") {
            const tripItem = localState.tripItems.find((item) => item.id === entry.tripItemId);
            if (tripItem && entry.inspectedAt) {
              inspectionDateUpdates.set(tripItem.companyProductId, entry.inspectedAt);
            }
          }
        });

        const updatedTripItems = localState.tripItems.map((item) => {
          const performedAt = sampleTripItemUpdates.get(item.id);
          const trackingCode = trackingCodeUpdatesFallback.get(item.id);
          if (!performedAt) {
            if (!trackingCode) return item;
            return {
              ...item,
              labEntryCode: trackingCode
            };
          }
          return {
            ...item,
            sampled: true,
            sampledAt: performedAt,
            labStatus: item.labStatus ?? "PENDING",
            ...(trackingCode ? { labEntryCode: trackingCode } : {})
          };
        });

        const companyProductDateUpdates = new Map<number, string>();
        sampleTripItemUpdates.forEach((performedAt, tripItemId) => {
          const tripItem = localState.tripItems.find((item) => item.id === tripItemId);
          if (tripItem) {
            companyProductDateUpdates.set(tripItem.companyProductId, performedAt);
          }
        });

        const updatedCompanyProducts = localState.companyProducts.map((cp) => {
          const performedAt = companyProductDateUpdates.get(cp.id);
          const inspectedAt = inspectionDateUpdates.get(cp.id);
          if (!performedAt && !inspectedAt) return cp;
          return {
            ...cp,
            ...(performedAt ? { lastSampleDate: performedAt } : {}),
            ...(inspectedAt ? { lastInspectionDate: inspectedAt } : {})
          };
        });

        const updatedTrips = localState.trips.map((tripEntry) =>
          tripEntry.id === input.tripId
            ? {
                ...tripEntry,
                status: "COMPLETED" as TripStatus
              }
            : tripEntry
        );

        return {
          tripCompletions: nextTripCompletions,
          trips: updatedTrips,
          tripItems: updatedTripItems,
          companyProducts: updatedCompanyProducts,
          employees: recalcEmployeeStatuses(localState.employees, updatedTrips)
        };
      });
    }
  }
}));
