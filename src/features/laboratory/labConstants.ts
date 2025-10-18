import type { LabShipmentDetails } from "../../types";

export const DEFAULT_STANDARD = "TS EN 206";

export type LabFieldConfig = { label: string; key: string; isDate?: boolean };

export const FIELD_LABELS: Record<string, LabFieldConfig[]> = {
  "TS EN 206": [
    { label: "7 Gün Basınç (MPa)", key: "day7" },
    { label: "28 Gün Basınç (MPa)", key: "day28" },
    { label: "Not", key: "remarks" }
  ],
  "TS EN 197-1": [
    { label: "Başlangıç Priz Süresi (dk)", key: "initialSetting" },
    { label: "Hacim Genleşmesi (mm)", key: "expansion" },
    { label: "Dayanım (MPa)", key: "strength" }
  ]
};

export const FALLBACK_DATA: Record<string, unknown> = {
  day7: 32.4,
  day28: 45.1,
  remarks: "Standart değerler içerisinde",
  initialSetting: 165,
  expansion: 2,
  strength: 52,
  notes: "-"
};

export const getFieldConfig = (standardNo?: string): LabFieldConfig[] =>
  FIELD_LABELS[standardNo ?? DEFAULT_STANDARD] ?? FIELD_LABELS[DEFAULT_STANDARD];

export const SHIPMENT_FIELDS: { key: keyof LabShipmentDetails; label: string; isDate?: boolean }[] = [
  { key: "productionDate", label: "Üretim Tarihi", isDate: true },
  { key: "lastSaleDate", label: "Son Satış Tarihi", isDate: true },
  { key: "storage", label: "Silo / Depo No" },
  { key: "sealNo", label: "Mühür No" },
  { key: "foreignMatter", label: "Yabancı Madde" },
  { key: "weight", label: "Numune Ağırlığı (kg)" }
];
