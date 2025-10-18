import type { LabShipmentDetails, ProductType } from "../../types";

export const DEFAULT_STANDARD = "TS EN 206";
export const DEFAULT_PRODUCT_TYPE: ProductType = "concrete";

export type LabFieldConfig = { label: string; key: string; isDate?: boolean };

const FIELD_LABELS_BY_PRODUCT: Partial<Record<ProductType, LabFieldConfig[]>> = {
  cement: [
    { label: "Erken dayanım (2 gün) - MPa", key: "cementEarlyStrength2d" },
    { label: "Erken dayanım (7 gün) - MPa", key: "cementEarlyStrength7d" },
    { label: "Standart dayanım - MPa", key: "cementStandardStrength" },
    { label: "Priz başlangıcı - dk", key: "cementInitialSetting" },
    { label: "Genleşme - mm", key: "cementExpansion" },
    { label: "Kızdırma kaybı - % kütlece", key: "cementLossOnIgnition" },
    { label: "Çözünmeyen kalıntı - % kütlece", key: "cementInsolubleResidue" },
    { label: "SO₃ - % kütlece", key: "cementSO3" },
    { label: "Klorür - % kütlece", key: "cementChloride" },
    { label: "Puzolanik özellik", key: "cementPozzolanicActivity" },
    { label: "Klinkerde C₃A - % kütlece", key: "cementClinkerC3A" },
    { label: "Hidratasyon ısısı - J/g", key: "cementHeatOfHydration" }
  ],
  fly_ash: [
    { label: "Kızdırma kaybı - % kütlece", key: "flyAshLossOnIgnition" },
    { label: "İncelik - % kütlece", key: "flyAshFineness" },
    { label: "Toplam alkali - % kütlece", key: "flyAshTotalAlkali" },
    { label: "Serbest CaO - % kütlece", key: "flyAshFreeCaO" },
    { label: "Toplam CaO - % kütlece", key: "flyAshTotalCaO" },
    { label: "Reaktif CaO - % kütlece", key: "flyAshReactiveCaO" },
    { label: "Klorür - % kütlece", key: "flyAshChloride" },
    { label: "Genleşme - mm", key: "flyAshExpansion" },
    { label: "Toplam S+A+F - % kütlece", key: "flyAshTotalSAF" },
    { label: "Reaktif SiO₂ - % kütlece", key: "flyAshReactiveSiO2" },
    { label: "MgO - % kütlece", key: "flyAshMgO" },
    { label: "Su ihtiyacı", key: "flyAshWaterDemand" },
    { label: "SO₃ - % kütlece", key: "flyAshSO3" },
    { label: "Toplam fosfat - % kütlece", key: "flyAshTotalPhosphate" },
    { label: "Çözünebilir fosfat - ppm", key: "flyAshSolublePhosphate" },
    { label: "Tanecik yoğunluğu (kg/m³)", key: "flyAshParticleDensity" },
    { label: "Priz başlangıcı (dk) - referans", key: "flyAshInitialSettingRef" },
    { label: "Priz başlangıcı (dk)", key: "flyAshInitialSetting" },
    { label: "Aktivite indeksi 28 gün - %", key: "flyAshActivityIndex28" },
    { label: "Aktivite indeksi 90 gün - %", key: "flyAshActivityIndex90" }
  ],
  slag: [
    { label: "MgO - % kütlece", key: "slagMgO" },
    { label: "Kükürt - % kütlece", key: "slagSulfur" },
    { label: "SO₃ - % kütlece", key: "slagSO3" },
    { label: "Kızdırma kaybı - % kütlece", key: "slagLossOnIgnition" },
    { label: "Klorür - % kütlece", key: "slagChloride" },
    { label: "Nem içeriği - % kütlece", key: "slagMoisture" },
    { label: "Blaine", key: "slagBlaine" },
    { label: "Priz başlangıcı (dk) - referans", key: "slagInitialSettingRef" },
    { label: "Priz başlangıcı (dk)", key: "slagInitialSetting" },
    { label: "Aktivite indeksi 7 gün - %", key: "slagActivityIndex7" },
    { label: "Aktivite indeksi 28 gün - %", key: "slagActivityIndex28" }
  ]
};

const FIELD_LABELS_BY_STANDARD: Record<string, LabFieldConfig[]> = {
  "TS EN 206": [
    { label: "7 Gün Basınç (MPa)", key: "concreteDay7" },
    { label: "28 Gün Basınç (MPa)", key: "concreteDay28" },
    { label: "Dayanıklılık", key: "concreteDurabilityRemarks" }
  ],
  "TS EN 197-1": [
    { label: "Başlangıç Priz Süresi (dk)", key: "cementInitialSettingLegacy" },
    { label: "Hacim Genleşmesi (mm)", key: "cementExpansionLegacy" },
    { label: "Dayanım (MPa)", key: "cementStrengthLegacy" }
  ]
};

export const FALLBACK_DATA: Record<string, unknown> = {
  concreteDay7: "",
  concreteDay28: "",
  concreteDurabilityRemarks: "",
  cementInitialSettingLegacy: "",
  cementExpansionLegacy: "",
  cementStrengthLegacy: "",
  cementEarlyStrength2d: "",
  cementEarlyStrength7d: "",
  cementStandardStrength: "",
  cementInitialSetting: "",
  cementExpansion: "",
  cementLossOnIgnition: "",
  cementInsolubleResidue: "",
  cementSO3: "",
  cementChloride: "",
  cementPozzolanicActivity: "",
  cementClinkerC3A: "",
  cementHeatOfHydration: "",
  flyAshLossOnIgnition: "",
  flyAshFineness: "",
  flyAshTotalAlkali: "",
  flyAshFreeCaO: "",
  flyAshTotalCaO: "",
  flyAshReactiveCaO: "",
  flyAshChloride: "",
  flyAshExpansion: "",
  flyAshTotalSAF: "",
  flyAshReactiveSiO2: "",
  flyAshMgO: "",
  flyAshWaterDemand: "",
  flyAshSO3: "",
  flyAshTotalPhosphate: "",
  flyAshSolublePhosphate: "",
  flyAshParticleDensity: "",
  flyAshInitialSettingRef: "",
  flyAshInitialSetting: "",
  flyAshActivityIndex28: "",
  flyAshActivityIndex90: "",
  slagMgO: "",
  slagSulfur: "",
  slagSO3: "",
  slagLossOnIgnition: "",
  slagChloride: "",
  slagMoisture: "",
  slagBlaine: "",
  slagInitialSettingRef: "",
  slagInitialSetting: "",
  slagActivityIndex7: "",
  slagActivityIndex28: ""
};

type FieldConfigOptions = {
  productType?: ProductType | null;
  standardNo?: string | null;
};

export const getFieldConfig = (options: FieldConfigOptions = {}): LabFieldConfig[] => {
  const { productType, standardNo } = options;

  if (productType && FIELD_LABELS_BY_PRODUCT[productType]) {
    return FIELD_LABELS_BY_PRODUCT[productType]!;
  }

  if (standardNo && FIELD_LABELS_BY_STANDARD[standardNo]) {
    return FIELD_LABELS_BY_STANDARD[standardNo];
  }

  return FIELD_LABELS_BY_STANDARD[DEFAULT_STANDARD] ?? [];
};

export const SHIPMENT_FIELDS: { key: keyof LabShipmentDetails; label: string; isDate?: boolean }[] = [
  { key: "productionDate", label: "Üretim Tarihi", isDate: true },
  { key: "lastSaleDate", label: "Son Satış Tarihi", isDate: true },
  { key: "storage", label: "Silo / Depo No" },
  { key: "sealNo", label: "Mühür No" },
  { key: "foreignMatter", label: "Yabancı Madde" },
  { key: "weight", label: "Numune Ağırlığı (kg)" }
];
