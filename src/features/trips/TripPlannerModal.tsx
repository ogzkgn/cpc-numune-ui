import { useEffect, useMemo, useState } from "react";

import Modal from "../../components/ui/Modal";
import Stepper from "../../components/ui/Stepper";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Chip from "../../components/ui/Chip";
import { useAppStore } from "../../state/useAppStore";
import { formatDate } from "../../utils/date";
import { hasSkillCoverage } from "../../utils/validation";
import { employeeStatusLabels, employeeStatusTokens, getProductTypeLabel } from "../../utils/labels";
import type { LodgingProvider, ProductType, TransportMode, TripDutyType } from "../../types";

const steps = [
  { id: "items", title: "Firma-Ürün Seçimi", description: "Seyahate dahil edilecek kayıtları işaretleyin" },
  { id: "assignees", title: "Ekip Atama", description: "Uygun saha ekiplerini seçin" },
  { id: "plan", title: "Planlama", description: "Tarih ve notları girin" }
];

type StepId = (typeof steps)[number]["id"];

type Requirement = ProductType;

const dutyTypeOptions: { value: TripDutyType; label: string }[] = [
  { value: "NUMUNE", label: "Numune" },
  { value: "GÖZETİM", label: "Gözetim" },
  { value: "BOTH", label: "Gözetim + Numune" }
];
const dutyTypeLabels: Record<TripDutyType, string> = {
  NUMUNE: "Numune",
  GÖZETİM: "Gözetim",
  BOTH: "Gözetim + Numune"
};


const transportOptions: { value: TransportMode; label: string }[] = [
  { value: "COMPANY_VEHICLE", label: "Şirket Aracı" },
  { value: "BUS", label: "Otobüs" },
  { value: "PLANE", label: "Uçak" },
  { value: "TRAIN", label: "Tren" }
];

const lodgingOptions: { value: LodgingProvider; label: string }[] = [
  { value: "COMPANY", label: "Firma Tarafından" },
  { value: "CPC", label: "CPC Tarafından" }
];

const TripPlannerModal = () => {
  const tripPlanner = useAppStore((state) => state.tripPlanner);
  const closeTripPlanner = useAppStore((state) => state.closeTripPlanner);
  const createTrip = useAppStore((state) => state.createTrip);
  const loadTrips = useAppStore((state) => state.loadTrips);
  const loadProducts = useAppStore((state) => state.loadProducts);
  const loadCompanyProductRecords = useAppStore((state) => state.loadCompanyProductRecords);
  const companyProductRecords = useAppStore((state) => state.companyProductRecords);
  const products = useAppStore((state) => state.products);
  const employees = useAppStore((state) => state.employees);
  const loadEmployees = useAppStore((state) => state.loadEmployees);
  const addToast = useAppStore((state) => state.addToast);
  const productMap = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);

  const [activeStep, setActiveStep] = useState<StepId>(steps[0].id);
  const [selectedCompanyProductIds, setSelectedCompanyProductIds] = useState<number[]>([]);
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<number[]>([]);
  const [dutyConfig, setDutyConfig] = useState<Record<number, { dutyType: TripDutyType; dutyAssigneeIds: number[] }>>({});
  const [plannedAt, setPlannedAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [transportMode, setTransportMode] = useState<TransportMode | "">("");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [lodgingProvider, setLodgingProvider] = useState<LodgingProvider | "">("");
  const [name, setName] = useState("");
  const [plannedBy, setPlannedBy] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (tripPlanner.open) {
      loadProducts();
      loadCompanyProductRecords();
      loadTrips();
      loadEmployees();
    }
  }, [tripPlanner.open, loadProducts, loadCompanyProductRecords, loadTrips, loadEmployees]);

  useEffect(() => {
    if (tripPlanner.open) {
      setActiveStep(steps[0].id);
      setSelectedCompanyProductIds(tripPlanner.selectedCompanyProductIds);
      setSelectedAssigneeIds([]);
      setDutyConfig({});
      setPlannedAt(new Date().toISOString().slice(0, 16));
      setTransportMode("");
      setVehiclePlate("");
      setLodgingProvider("");
      setName("");
      setPlannedBy("");
      setNotes("");

      // Fetch latest employees when planner opens to ensure availability/status is up to date
      loadEmployees();
    }
  }, [tripPlanner.open, tripPlanner.selectedCompanyProductIds, loadEmployees]);

  const selectedProducts = useMemo(() => {
    const selectedSet = new Set(selectedCompanyProductIds);
    return companyProductRecords
      .map((record) => {
        if (record.id === undefined || !selectedSet.has(record.id)) return null;
        return {
          id: record.id,
          record,
          product: record.productId ? productMap.get(record.productId) : undefined
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
  }, [selectedCompanyProductIds, companyProductRecords, productMap]);

  const requiredProductTypes = useMemo(() => {
    const types = new Set<Requirement>();
    selectedProducts.forEach((item) => {
      if (item.product?.productType) {
        types.add(item.product.productType);
      } else if (item.record.productType) {
        types.add(item.record.productType);
      }
    });
    return Array.from(types);
  }, [selectedProducts]);

  const employeeMap = useMemo(() => new Map(employees.map((employee) => [employee.id, employee])), [employees]);
  const selectedAssignees = useMemo(() => {
    const idSet = new Set(selectedAssigneeIds);
    return employees.filter((employee) => idSet.has(employee.id));
  }, [selectedAssigneeIds, employees]);

  useEffect(() => {
    if (!tripPlanner.open) {
      return;
    }

    setDutyConfig((prev) => {
      const assigneeSet = new Set(selectedAssigneeIds);
      const next: Record<number, { dutyType: TripDutyType; dutyAssigneeIds: number[] }> = {};
      let changed = false;

      selectedCompanyProductIds.forEach((companyProductId) => {
        const existing = prev[companyProductId];
        const filteredAssignees =
          existing?.dutyAssigneeIds.filter((memberId) => assigneeSet.has(memberId)) ?? [];
        const fallbackAssignees =
          filteredAssignees.length > 0 ? filteredAssignees : [...selectedAssigneeIds];
        const dutyType = existing?.dutyType ?? "NUMUNE";

        next[companyProductId] = {
          dutyType,
          dutyAssigneeIds: fallbackAssignees
        };

        if (!existing) {
          changed = true;
          return;
        }

        if (existing.dutyType !== dutyType) {
          changed = true;
        } else if (
          existing.dutyAssigneeIds.length !== fallbackAssignees.length ||
          existing.dutyAssigneeIds.some((value, index) => value !== fallbackAssignees[index])
        ) {
          changed = true;
        }
      });

      if (!changed && Object.keys(prev).length === Object.keys(next).length) {
        return prev;
      }

      return next;
    });
  }, [tripPlanner.open, selectedCompanyProductIds, selectedAssigneeIds]);


  const coverageOk = selectedProducts.length === 0 || hasSkillCoverage(selectedAssignees, requiredProductTypes);
  const canProceedStep1 = selectedProducts.length > 0;
  const canProceedStep2 = selectedAssigneeIds.length > 0 && coverageOk;
  const dutyConfigValid = selectedCompanyProductIds.every((id) => {
    const config = dutyConfig[id];
    if (!config) return false;
    if (!config.dutyType) return false;
    return config.dutyAssigneeIds.length > 0;
  });

  const isCompanyVehicle = transportMode === "COMPANY_VEHICLE";
  const transportSelected = transportMode !== "";
  const lodgingSelected = lodgingProvider !== "";
  const vehicleValid = !isCompanyVehicle || vehiclePlate.trim().length > 0;
  const canSubmit =
    canProceedStep2 && Boolean(plannedAt) && dutyConfigValid && transportSelected && lodgingSelected && vehicleValid;
  const selectedTransportLabel = transportMode
    ? transportOptions.find((option) => option.value === transportMode)?.label
    : undefined;
  const selectedLodgingLabel = lodgingProvider
    ? lodgingOptions.find((option) => option.value === lodgingProvider)?.label
    : undefined;

  const handleToggleAssignee = (id: number) => {
    setSelectedAssigneeIds((prev) => {
      const set = new Set(prev);
      if (set.has(id)) {
        set.delete(id);
      } else {
        set.add(id);
      }
      return Array.from(set);
    });
  };

  const handleDutyTypeChange = (companyProductId: number, dutyType: TripDutyType) => {
    setDutyConfig((prev) => {
      const existing = prev[companyProductId];
      const allowed = new Set(selectedAssigneeIds);
      const baseAssignees = existing?.dutyAssigneeIds ?? selectedAssigneeIds;
      const filtered = baseAssignees.filter((id) => allowed.has(id));
      const nextAssignees =
        filtered.length > 0 ? filtered : [...selectedAssigneeIds];

      return {
        ...prev,
        [companyProductId]: {
          dutyType,
          dutyAssigneeIds: nextAssignees
        }
      };
    });
  };

  const handleDutyAssigneeToggle = (companyProductId: number, assigneeId: number) => {
    if (!selectedAssigneeIds.includes(assigneeId)) {
      return;
    }

    setDutyConfig((prev) => {
      const existing =
        prev[companyProductId] ?? {
          dutyType: "NUMUNE" as TripDutyType,
          dutyAssigneeIds: [...selectedAssigneeIds]
        };
      const set = new Set(existing.dutyAssigneeIds);
      if (set.has(assigneeId)) {
        set.delete(assigneeId);
      } else {
        set.add(assigneeId);
      }
      return {
        ...prev,
        [companyProductId]: {
          dutyType: existing.dutyType,
          dutyAssigneeIds: Array.from(set)
        }
      };
    });
  };


  const handleClose = () => {
    closeTripPlanner();
  };

  const handleNext = () => {
    if (activeStep === "items" && canProceedStep1) {
      setActiveStep("assignees");
    } else if (activeStep === "assignees" && canProceedStep2) {
      setActiveStep("plan");
    }
  };

  const handleBack = () => {
    if (activeStep === "plan") {
      setActiveStep("assignees");
    } else if (activeStep === "assignees") {
      setActiveStep("items");
    }
  };

  const handleCreateTrip = async () => {
    if (!canSubmit) return;
    setSaving(true);
    const isoDate = plannedAt ? new Date(plannedAt).toISOString() : undefined;
    const dutiesPayload = selectedCompanyProductIds.map((companyProductId) => {
      const config = dutyConfig[companyProductId];
      return {
        companyProductId,
        dutyType: config?.dutyType ?? "NUMUNE",
        dutyAssigneeIds: config?.dutyAssigneeIds?.slice() ?? [...selectedAssigneeIds]
      };
    });

    createTrip({
      name: name || undefined,
      plannedAt: isoDate,
      notes: notes || undefined,
      plannedBy: plannedBy || undefined,
      companyProductIds: selectedCompanyProductIds,
      assigneeIds: selectedAssigneeIds,
      status: "ACTIVE",
      duties: dutiesPayload,
      transportMode: transportMode || undefined,
      vehiclePlate: isCompanyVehicle ? vehiclePlate.trim() || undefined : undefined,
      lodgingProvider: lodgingProvider || undefined
    });

    addToast({ title: "Seyahat planlandı", variant: "success" });
    setSaving(false);
  };

  if (!tripPlanner.open) {
    return null;
  }

  return (
    <Modal
      open={tripPlanner.open}
      onClose={handleClose}
      title="Seyahat Planlayıcı"
      description="Firma-ürün seçiminden ekip atamasına kadar süreci tamamlayın"
      size="xl"
      className="max-w-5xl"
      footer={
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-2">
            {activeStep !== steps[0].id ? (
              <Button variant="ghost" onClick={handleBack}>
                Geri
              </Button>
            ) : (
              <span className="text-xs text-slate-500">Adım 1/3</span>
            )}
            {activeStep === "assignees" && !coverageOk ? (
              <span className="text-xs text-red-500">Seçilen ekip ürün yetkinliklerini karşılamıyor</span>
            ) : null}
          </div>
          {activeStep === "plan" ? (
            <Button onClick={handleCreateTrip} disabled={!canSubmit || saving}>
              Seyahati Oluştur
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={(activeStep === "items" && !canProceedStep1) || (activeStep === "assignees" && !canProceedStep2)}
            >
              İleri
            </Button>
          )}
        </div>
      }
    >
      <div className="max-h-[70vh] overflow-y-auto pr-1">
        <Stepper steps={steps} activeStepId={activeStep}>
        {activeStep === "items" ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-slate-600">
                Seçilen firma-ürün kayıtlarını gözden geçirin. Düzenleme için geri dönün.
              </p>
              <Badge variant="info">Seçili {selectedProducts.length}</Badge>
            </div>
            {selectedProducts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                Seyahat oluşturmak için kayıt seçin.
              </div>
            ) : (
              <div className="grid max-h-[420px] grid-cols-1 gap-3 overflow-y-auto pr-1 md:grid-cols-2">
                {selectedProducts.map((item) => (
                  <div
                    key={item.record.id ?? item.record.companyName}
                    className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-slate-900">{item.record.companyName}</h3>
                      <Badge variant="neutral">{getProductTypeLabel(item.record.productType)}</Badge>
                    </div>
                    <p className="text-xs text-slate-600">{item.record.productName ?? item.product?.name ?? "Ürün"}</p>
                    <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-500">
                      <span>Ürün Kodu: {item.record.productCode ?? "-"}</span>
                      <span>BT Kod: {item.record.btCode ?? "-"}</span>
                      <span>Kod: {item.record.code ?? "-"}</span>
                      <span>Standart: {item.record.standard ?? item.product?.standardNo ?? "-"}</span>
                      <span>İl/İlçe: {item.record.location ?? "-"}</span>
                      <span>Belge: {formatDate(item.record.certificateDate)}</span>
                      <span>Son Numune: {formatDate(item.record.lastSampleDate)}</span>
                      <span>Son Denetim: {formatDate(item.record.lastInspectionDate)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {activeStep === "assignees" ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {requiredProductTypes.length === 0 ? (
                <span className="text-xs text-slate-500">Ürün seçildiğinde ihtiyaç duyulan yetkinlikler burada listelenecek.</span>
              ) : (
                requiredProductTypes.map((type) => (
                  <Chip key={type} active>
                    {getProductTypeLabel(type)}
                  </Chip>
                ))
              )}
            </div>
            <div className="grid max-h-[420px] grid-cols-1 gap-3 overflow-y-auto pr-1 md:grid-cols-2">
              {employees.map((employee) => {
                const selected = selectedAssigneeIds.includes(employee.id);
                return (
                  <button
                    key={employee.id}
                    type="button"
                    onClick={() => handleToggleAssignee(employee.id)}
                    className={`flex flex-col gap-2 rounded-2xl border p-4 text-left transition ${
                      selected ? "border-brand-primary bg-brand-primary/5" : "border-slate-200 hover:border-brand-primary"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{employee.name}</p>
                        {employee.city ? <p className="text-xs text-slate-500">{employee.city}</p> : null}
                      </div>
                      <Badge className={employeeStatusTokens[employee.status]}>{employeeStatusLabels[employee.status]}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {employee.skills.map((skill) => (
                        <Badge key={skill} variant={requiredProductTypes.includes(skill) ? "info" : "neutral"}>
                          {getProductTypeLabel(skill)}
                        </Badge>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {activeStep === "plan" ? (
          <div className="space-y-6 pb-2">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                Planlanan Tarih
                <input
                  type="date"
                  value={plannedAt}
                  onChange={(event) => setPlannedAt(event.target.value)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                Ulaşım Türü
                <select
                  value={transportMode}
                  onChange={(event) => {
                    const next = event.target.value as TransportMode | "";
                    setTransportMode(next);
                    if (next !== "COMPANY_VEHICLE") {
                      setVehiclePlate("");
                    }
                  }}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">Seçiniz</option>
                  {transportOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              {isCompanyVehicle ? (
                <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                  Araç Plaka No
                  <input
                    value={vehiclePlate}
                    onChange={(event) => setVehiclePlate(event.target.value)}
                    placeholder="34 ABC 123"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <span className="text-[11px] text-slate-500">Şirket aracı için plaka zorunludur.</span>
                </label>
              ) : null}
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                Konaklama
                <select
                  value={lodgingProvider}
                  onChange={(event) => setLodgingProvider(event.target.value as LodgingProvider | "")}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">Seçiniz</option>
                  {lodgingOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="md:col-span-2 flex flex-col gap-1 text-sm font-medium text-slate-700">
                Seyahat Adı (Opsiyonel)
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Örn. Marmara saha turu"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="md:col-span-2 flex flex-col gap-1 text-sm font-medium text-slate-700">
                Planlamayı Yapan
                <input
                  value={plannedBy}
                  onChange={(event) => setPlannedBy(event.target.value)}
                  placeholder="Örn. Ayşe Yıldız"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="md:col-span-2 flex flex-col gap-1 text-sm font-medium text-slate-700">
                Notlar
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={4}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Varsa lojistik veya özel talimatları girin"
                />
              </label>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-sm font-semibold text-slate-700">Görev Ayarları</h4>
                {!dutyConfigValid ? (
                  <span className="text-xs text-red-600">Her firma-ürün için görev nedeni ve ekip seçimi zorunlu.</span>
                ) : null}
              </div>
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="min-w-full border-collapse text-xs md:text-sm">
                  <thead className="bg-slate-50 text-left text-slate-500">
                    <tr>
                      <th className="px-3 py-2 font-medium">Firma / Ürün</th>
                      <th className="px-3 py-2 font-medium">Ürün Kodu</th>
                      <th className="px-3 py-2 font-medium">Görev Nedeni*</th>
                      <th className="px-3 py-2 font-medium">Görev Ekibi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedProducts.map((item) => {
                      const config = dutyConfig[item.id];
                      const assignedIds = config?.dutyAssigneeIds ?? [];
                      const rowInvalid = !config || assignedIds.length === 0;

                      return (
                        <tr key={item.id} className={rowInvalid ? "bg-red-50/60" : ""}>
                          <td className="px-3 py-3 align-top text-slate-700">
                            <p className="text-sm font-semibold text-slate-900">{item.record.companyName}</p>
                            <p className="text-xs text-slate-600">{item.record.productName ?? item.product?.name ?? "-"}</p>
                            <div className="mt-1 text-[11px] text-slate-500">
                              {item.product?.standardNo || item.record.standard ? (
                                <span>Standart: {item.record.standard ?? item.product?.standardNo}</span>
                              ) : null}
                              {item.record.location ? <span className="ml-2">Lokasyon: {item.record.location}</span> : null}
                            </div>
                          </td>
                          <td className="px-3 py-3 align-top text-slate-700">
                            {item.record.productCode ?? "-"}
                          </td>
                          <td className="px-3 py-3 align-top">
                            <select
                              className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs md:text-sm"
                              value={config?.dutyType ?? "NUMUNE"}
                              onChange={(event) =>
                                handleDutyTypeChange(item.id, event.target.value as TripDutyType)
                              }
                            >
                              {dutyTypeOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-3 align-top">
                            {selectedAssignees.length === 0 ? (
                              <p className="text-xs text-slate-500">Ekip seçmek için önceki adımı tamamlayın.</p>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {selectedAssignees.map((assignee) => {
                                  const active = assignedIds.includes(assignee.id);
                                  return (
                                    <button
                                      key={assignee.id}
                                      type="button"
                                      onClick={() => handleDutyAssigneeToggle(item.id, assignee.id)}
                                      className={`rounded-full border px-2 py-1 text-xs transition ${
                                        active
                                          ? "border-brand-primary bg-brand-primary/10 text-brand-primary"
                                          : "border-slate-300 text-slate-600 hover:border-brand-primary"
                                      }`}
                                    >
                                      {assignee.name}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                            {rowInvalid ? (
                              <p className="mt-2 text-[11px] text-red-600">En az bir ekip üyesi seçin.</p>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                    {selectedProducts.length === 0 ? (
                      <tr>
                        <td className="px-3 py-6 text-center text-xs text-slate-500" colSpan={3}>
                          Görev ataması yapılacak firma-ürün bulunmuyor.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-slate-700">Özet</h4>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                <p>Firma-Ürün sayısı: {selectedProducts.length}</p>
                <p>Atanan ekip: {selectedAssignees.map((item) => item.name).join(", ") || "Belirtilmedi"}</p>
                <p>Ulaşım: {selectedTransportLabel ?? "Belirtilmedi"}</p>
                {isCompanyVehicle ? <p>Araç Plakası: {vehiclePlate || "-"}</p> : null}
                <p>Konaklama: {selectedLodgingLabel ?? "Belirtilmedi"}</p>
                <p>Planlamayı yapan: {plannedBy || "Belirtilmedi"}</p>
                <p>Tarih: {plannedAt ? formatDate(new Date(plannedAt).toISOString()) : "Belirtilmedi"}</p>
                <div className="mt-2 space-y-1">
                  <p className="text-[11px] font-semibold text-slate-700">Görev dağılımları:</p>
                  <ul className="space-y-1">
                    {selectedProducts.map((item) => {
                      const config = dutyConfig[item.id];
                      const dutyLabel = config ? dutyTypeLabels[config.dutyType] : "Belirtilmedi";
                      const teamNames =
                        config?.dutyAssigneeIds
                          .map((id) => employeeMap.get(id)?.name)
                          .filter((value): value is string => Boolean(value))
                          .join(", ") ?? "";

                      return (
                        <li key={item.id}>
                          {item.record.companyName} / {item.record.productName ?? item.product?.name ?? "-"}
                          {item.record.productCode ? ` [${item.record.productCode}]` : ""}: {dutyLabel}{" "}
                          {teamNames ? `(${teamNames})` : "(Ekip seçilmedi)"}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </Stepper>
      </div>
    </Modal>
  );
};

export default TripPlannerModal;
