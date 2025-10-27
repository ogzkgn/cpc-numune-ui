import { create } from "zustand";

import {
  companies as mockCompanies,
  companyProducts as mockCompanyProducts,
  employees as mockEmployees,
  labs as mockLabs,
  products as mockProducts,
  sites as mockSites,
  tripCompletions as mockTripCompletions,
  tripItems as mockTripItems,
  trips as mockTrips
} from "../data/mockData";
import { generateLabEntryCode } from "../utils/samples";
import type {
  Company,
  CompanyProduct,
  CompanyProductStatus,
  ConfigurableCycle,
  Employee,
  Lab,
  LabForm,
  LabFormDocument,
  LabShipmentDetails,
  LodgingProvider,
  Product,
  Site,
  ToastMessage,
  TransportMode,
  Trip,
  TripCompletion,
  TripCompletionEntry,
  TripDutyType,
  TripItem,
  TripItemLabStatus,
  PaymentStatus,
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

interface AppState {
  companies: Company[];
  sites: Site[];
  products: Product[];
  companyProducts: CompanyProduct[];
  labs: Lab[];
  employees: Employee[];
  trips: Trip[];
  tripItems: TripItem[];
  labForms: LabForm[];
  tripCompletions: TripCompletion[];
  samplingCycles: ConfigurableCycle[];
  toasts: ToastMessage[];
  activeRole: UserRole;
  tripPlanner: TripPlannerState;
  setActiveRole: (role: UserRole) => void;
  addToast: (toast: Omit<ToastMessage, "id"> & { id?: string }) => void;
  removeToast: (id: string) => void;
  openTripPlanner: (companyProductIds: number[]) => void;
  closeTripPlanner: () => void;
  createTrip: (payload: CreateTripInput) => void;
  updateTripStatus: (tripId: number, status: TripStatus) => void;
  updateTrip: (tripId: number, changes: Partial<Pick<Trip, "name" | "plannedAt" | "notes">>) => void;
  markSampleTaken: (inputs: SampleTakenInput[]) => void;
  addCompanyProduct: (input: CreateCompanyProductInput) => void;
  updateTripItemLabStatus: (
    tripItemId: number,
    status: TripItemLabStatus,
    options?: { sentAt?: string; shipment?: LabShipmentDetails; labId?: number; labEntryCode?: string }
  ) => void;
  upsertLabForm: (input: UpsertLabFormInput) => void;
  updateCompanyProduct: (input: UpdateCompanyProductInput) => void;
  setCompanyProductStatus: (companyProductId: number, status: CompanyProduct["status"]) => void;
  setSamplingCycle: (productType: ConfigurableCycle["productType"], months: number) => void;
  completeTrip: (input: CompleteTripInput) => void;
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

export const useAppStore = create<AppState>((set) => ({
  companies: cloneData(mockCompanies),
  sites: cloneData(mockSites),
  products: cloneData(mockProducts),
  companyProducts: cloneData(mockCompanyProducts),
  labs: cloneData(mockLabs),
  employees: cloneData(mockEmployees),
  trips: cloneData(mockTrips),
  tripItems: cloneData(mockTripItems),
  labForms: [],
  tripCompletions: cloneData(mockTripCompletions),
  samplingCycles: [
    { productType: "slag", months: 2 },
    { productType: "fly_ash", months: 2 },
    { productType: "cement", months: 2 },
    { productType: "concrete", months: 4 }
  ],
  toasts: [],
  activeRole: "admin",
  tripPlanner: {
    open: false,
    selectedCompanyProductIds: []
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

  createTrip: ({
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
    const nextId = generateId();
    const now = new Date().toISOString();

    const dutyAssignments: Trip["dutyAssignments"] = {};
    const dutyMap = new Map<number, PlannerDutyConfig>();
    duties?.forEach((entry) => {
      dutyMap.set(entry.companyProductId, entry);
    });

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

    const newTrip: Trip = {
      id: nextId,
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
      tripId: nextId,
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
        tripPlanner: {
          open: false,
          selectedCompanyProductIds: []
        }
      };
    });
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

  updateTripItemLabStatus: (tripItemId, status, options) => {
    set((state) => ({
      tripItems: state.tripItems.map((item) =>
        item.id === tripItemId
          ? {
              ...item,
              labStatus: status,
              ...(options?.sentAt ? { labSentAt: options.sentAt } : {}),
              ...(options?.shipment ? { labShipmentDetails: { ...options.shipment } } : {}),
              ...(options?.labId !== undefined ? { labAssignedLabId: options.labId } : {}),
              ...(options?.labEntryCode ? { labEntryCode: options.labEntryCode } : {})
            }
          : item
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

  completeTrip: (input) => {
    set((state) => {
      const timestamp = new Date().toISOString();
      const baseTripItems = state.tripItems;
      const trip = state.trips.find((entry) => entry.id === input.tripId);

      const trackingCodeUpdates = new Map<number, string>();

      const normalizedEntries: TripCompletionEntry[] = input.entries.map((entry) => {
        const tripItem = baseTripItems.find((item) => item.id === entry.tripItemId);
        const dutyAssignment =
          tripItem && trip?.dutyAssignments ? trip.dutyAssignments[tripItem.companyProductId] : undefined;
        const companyProduct = tripItem
          ? state.companyProducts.find((product) => product.id === tripItem.companyProductId)
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

      const existsIndex = state.tripCompletions.findIndex((entry) => entry.tripId === input.tripId);
      const nextTripCompletions =
        existsIndex >= 0
          ? state.tripCompletions.map((entry, index) => (index === existsIndex ? nextCompletion : entry))
          : [...state.tripCompletions, nextCompletion];

      const sampleTripItemUpdates = new Map<number, string>();
      const inspectionDateUpdates = new Map<number, string>();
      normalizedEntries.forEach((entry) => {
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
        const tripItem = state.tripItems.find((item) => item.id === tripItemId);
        if (tripItem) {
          companyProductDateUpdates.set(tripItem.companyProductId, performedAt);
        }
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

      const updatedTrips = state.trips.map((trip) =>
        trip.id === input.tripId
          ? {
              ...trip,
              status: "COMPLETED" as TripStatus
            }
          : trip
      );

      return {
        tripCompletions: nextTripCompletions,
        trips: updatedTrips,
        tripItems: updatedTripItems,
        companyProducts: updatedCompanyProducts,
        employees: recalcEmployeeStatuses(state.employees, updatedTrips)
      };
    });
  }
}));
