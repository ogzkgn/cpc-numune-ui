export type ProductType = "concrete" | "cement" | "slag" | "fly_ash";

export interface Company {
  id: number;
  name: string;
  customerCode?: string;
}

export interface Site {
  id: number;
  companyId: number;
  city: string;
  district?: string;
  address?: string;
  siteCode?: string;
}

export interface Product {
  id: number;
  name: string;
  groupName?: string;
  productType: ProductType;
  standardNo?: string;
}

export type CompanyProductStatus = "active" | "archived";

export interface CompanyProduct {
  id: number;
  companyId: number;
  siteId?: number;
  productId: number;
  productCode?: string;
  certificateNo?: string;
  certificateDate?: string;
  lastSampleDate?: string;
  lastInspectionDate?: string;
  status?: CompanyProductStatus;
}

export interface Lab {
  id: number;
  name: string;
}

export type TransportMode = "COMPANY_VEHICLE" | "BUS" | "PLANE" | "TRAIN";
export type LodgingProvider = "COMPANY" | "CPC";

export type TripDutyType = "GÖZETİM" | "NUMUNE" | "BOTH";

export interface TripCompletionEntry {
  tripItemId: number;
  dutyType: TripDutyType;
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
}

export interface TripCompletion {
  tripId: number;
  completedByEmployeeIds: number[];
  transportMode: TransportMode;
  vehiclePlate?: string;
  totalKm?: number;
  totalDays?: number;
  lodgingProvider?: LodgingProvider;
  entries: TripCompletionEntry[];
  createdAt: string;
}

export type EmployeeStatus = "available" | "busy";

export interface Employee {
  id: number;
  name: string;
  city?: string;
  status: EmployeeStatus;
  skills: ProductType[];
}

export type TripStatus = "PLANNED" | "ACTIVE" | "COMPLETED" | "CANCELLED";

export interface TripDutyAssignment {
  dutyType: TripDutyType;
  dutyAssigneeIds: number[];
}

export interface Trip {
  id: number;
  name?: string;
  plannedAt?: string;
  status: TripStatus;
  assigneeIds: number[];
  notes?: string;
  dutyAssignments: Record<number, TripDutyAssignment>;
}

export type TripItemLabStatus = "PENDING" | "ACCEPTED" | "DRAFT" | "SUBMITTED" | "APPROVED";

export interface LabShipmentDetails {
  productionDate: string;
  lastSaleDate: string;
  storage: string;
  sealNo: string;
  foreignMatter: string;
  weight: string;
}

export interface TripItem {
  id: number;
  tripId: number;
  companyProductId: number;
  sampled: boolean;
  sampledAt?: string;
  labStatus?: TripItemLabStatus;
  labSentAt?: string;
  labShipmentDetails?: LabShipmentDetails;
  labAssignedLabId?: number;
  labEntryCode?: string;
  dutyType: TripDutyType;
  dutyAssigneeIds: number[];
}

export type LabFormStatus = "DRAFT" | "SUBMITTED" | "APPROVED";

export interface LabForm {
  id: number;
  tripItemId: number;
  standardNo?: string;
  data: Record<string, unknown>;
  status: LabFormStatus;
  updatedAt?: string;
}

export interface ConfigurableCycle {
  productType: Extract<ProductType, "slag" | "fly_ash" | "cement" | "concrete">;
  months: number;
}

export type ToastVariant = "success" | "error" | "info";

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
}
