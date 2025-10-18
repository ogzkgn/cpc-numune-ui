import { useEffect, useMemo, useState } from "react";

import Modal from "../../components/ui/Modal";
import Stepper from "../../components/ui/Stepper";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Chip from "../../components/ui/Chip";
import { useAppStore } from "../../state/useAppStore";
import { useEntityMaps } from "../../hooks/useEntityMaps";
import { formatDate } from "../../utils/date";
import { hasSkillCoverage, isEmployeeAvailable } from "../../utils/validation";
import { employeeStatusLabels, employeeStatusTokens, productTypeLabels } from "../../utils/labels";
import type { ProductType, TripDutyType } from "../../types";

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
  "GÖZETİM": "Gözetim",
  BOTH: "Gözetim + Numune"
};


const TripPlannerModal = () => {
  const tripPlanner = useAppStore((state) => state.tripPlanner);
  const closeTripPlanner = useAppStore((state) => state.closeTripPlanner);
  const createTrip = useAppStore((state) => state.createTrip);
  const companyProducts = useAppStore((state) => state.companyProducts);
  const employees = useAppStore((state) => state.employees);
  const addToast = useAppStore((state) => state.addToast);
  const { productMap, companyMap, siteMap } = useEntityMaps();

  const [activeStep, setActiveStep] = useState<StepId>(steps[0].id);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCompanyProductIds, setSelectedCompanyProductIds] = useState<number[]>([]);
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<number[]>([]);
  const [dutyConfig, setDutyConfig] = useState<Record<number, { dutyType: TripDutyType; dutyAssigneeIds: number[] }>>({});
  const [plannedAt, setPlannedAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (tripPlanner.open) {
      setActiveStep(steps[0].id);
      setSelectedCompanyProductIds(tripPlanner.selectedCompanyProductIds);
      setSelectedAssigneeIds([]);
      setDutyConfig({});
      setPlannedAt(new Date().toISOString().slice(0, 16));
      setName("");
      setNotes("");
    }
  }, [tripPlanner.open, tripPlanner.selectedCompanyProductIds]);

  const companyProductOptions = useMemo(() => {
    return companyProducts
      .map((cp) => {
        const product = productMap.get(cp.productId);
        const company = companyMap.get(cp.companyId);
        if (!product || !company) return null;
        return {
          cp,
          product,
          company,
          site: cp.siteId ? siteMap.get(cp.siteId) : undefined
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
  }, [companyProducts, productMap, companyMap, siteMap]);

  const filteredCompanyProducts = useMemo(() => {
    if (!searchTerm) return companyProductOptions;
    const query = searchTerm.toLowerCase();
    return companyProductOptions.filter((item) => {
      return (
        item.company.name.toLowerCase().includes(query) ||
        item.product.name.toLowerCase().includes(query) ||
        item.product.standardNo?.toLowerCase().includes(query) ||
        item.site?.city?.toLowerCase().includes(query)
      );
    });
  }, [companyProductOptions, searchTerm]);

  const selectedProducts = useMemo(() => {
    const selectedSet = new Set(selectedCompanyProductIds);
    return companyProductOptions.filter((item) => selectedSet.has(item.cp.id));
  }, [selectedCompanyProductIds, companyProductOptions]);

  const requiredProductTypes = useMemo(() => {
    const types = new Set<Requirement>();
    selectedProducts.forEach((item) => types.add(item.product.productType));
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
  const canProceedStep1 = selectedCompanyProductIds.length > 0;
  const canProceedStep2 = selectedAssigneeIds.length > 0 && coverageOk;
  const dutyConfigValid = selectedCompanyProductIds.every((id) => {
    const config = dutyConfig[id];
    if (!config) return false;
    if (!config.dutyType) return false;
    return config.dutyAssigneeIds.length > 0;
  });
  const canSubmit = canProceedStep2 && Boolean(plannedAt) && dutyConfigValid;

  const handleToggleProduct = (id: number) => {
    setSelectedCompanyProductIds((prev) => {
      const set = new Set(prev);
      if (set.has(id)) {
        set.delete(id);
      } else {
        set.add(id);
      }
      return Array.from(set);
    });
  };

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

  const handleCreateTrip = () => {
    if (!canSubmit) return;
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
      companyProductIds: selectedCompanyProductIds,
      assigneeIds: selectedAssigneeIds,
      status: "ACTIVE",
      duties: dutiesPayload
    });

    addToast({ title: "Seyahat planlandı", variant: "success" });
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
            <Button onClick={handleCreateTrip} disabled={!canSubmit}>
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
      <Stepper steps={steps} activeStepId={activeStep}>
        {activeStep === "items" ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <input
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Firma, ürün veya şehir ara"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
              <Badge variant="info">Seçili {selectedCompanyProductIds.length}</Badge>
            </div>
            <div className="grid max-h-[420px] grid-cols-1 gap-3 overflow-y-auto pr-1 md:grid-cols-2">
              {filteredCompanyProducts.map((item) => {
                const selected = selectedCompanyProductIds.includes(item.cp.id);
                return (
                  <button
                    key={item.cp.id}
                    type="button"
                    onClick={() => handleToggleProduct(item.cp.id)}
                    className={`flex flex-col gap-2 rounded-2xl border p-4 text-left transition ${
                      selected ? "border-brand-primary bg-brand-primary/5" : "border-slate-200 hover:border-brand-primary"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-slate-900">{item.company.name}</h3>
                      <Badge variant={selected ? "success" : "neutral"}>{productTypeLabels[item.product.productType]}</Badge>
                    </div>
                    <p className="text-xs text-slate-500">{item.product.name}</p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      {item.product.standardNo ? <span>Standart: {item.product.standardNo}</span> : null}
                      {item.site ? <span>Şehir: {item.site.city}</span> : null}
                      <span>Son numune: {formatDate(item.cp.lastSampleDate)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
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
                    {productTypeLabels[type]}
                  </Chip>
                ))
              )}
            </div>
            <div className="grid max-h-[420px] grid-cols-1 gap-3 overflow-y-auto pr-1 md:grid-cols-2">
              {employees.map((employee) => {
                const selected = selectedAssigneeIds.includes(employee.id);
                const disabled = !isEmployeeAvailable(employee);
                return (
                  <button
                    key={employee.id}
                    type="button"
                    onClick={() => (!disabled ? handleToggleAssignee(employee.id) : undefined)}
                    className={`flex flex-col gap-2 rounded-2xl border p-4 text-left transition ${
                      selected ? "border-brand-primary bg-brand-primary/5" : "border-slate-200"
                    } ${disabled ? "opacity-60" : "hover:border-brand-primary"}`}
                    disabled={disabled}
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
                          {productTypeLabels[skill]}
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
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                Planlanan Tarih / Saat
                <input
                  type="datetime-local"
                  value={plannedAt}
                  onChange={(event) => setPlannedAt(event.target.value)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                Seyahat Adı (Opsiyonel)
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Örn. Marmara saha turu"
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
                      <th className="px-3 py-2 font-medium">Görev Nedeni*</th>
                      <th className="px-3 py-2 font-medium">Görev Ekibi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedProducts.map((item) => {
                      const config = dutyConfig[item.cp.id];
                      const assignedIds = config?.dutyAssigneeIds ?? [];
                      const rowInvalid = !config || assignedIds.length === 0;

                      return (
                        <tr key={item.cp.id} className={rowInvalid ? "bg-red-50/60" : ""}>
                          <td className="px-3 py-3 align-top text-slate-700">
                            <p className="text-sm font-semibold text-slate-900">{item.company.name}</p>
                            <p className="text-xs text-slate-600">{item.product.name}</p>
                            <div className="mt-1 text-[11px] text-slate-500">
                              {item.product.standardNo ? <span>Standart: {item.product.standardNo}</span> : null}
                              {item.site ? <span className="ml-2">Lokasyon: {item.site.city}</span> : null}
                            </div>
                          </td>
                          <td className="px-3 py-3 align-top">
                            <select
                              className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs md:text-sm"
                              value={config?.dutyType ?? "NUMUNE"}
                              onChange={(event) =>
                                handleDutyTypeChange(item.cp.id, event.target.value as TripDutyType)
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
                                      onClick={() => handleDutyAssigneeToggle(item.cp.id, assignee.id)}
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
                <p>Tarih: {plannedAt ? formatDate(new Date(plannedAt).toISOString()) : "Belirtilmedi"}</p>
                <div className="mt-2 space-y-1">
                  <p className="text-[11px] font-semibold text-slate-700">Görev dağılımları:</p>
                  <ul className="space-y-1">
                    {selectedProducts.map((item) => {
                      const config = dutyConfig[item.cp.id];
                      const dutyLabel = config ? dutyTypeLabels[config.dutyType] : "Belirtilmedi";
                      const teamNames =
                        config?.dutyAssigneeIds
                          .map((id) => employeeMap.get(id)?.name)
                          .filter((value): value is string => Boolean(value))
                          .join(", ") ?? "";

                      return (
                        <li key={item.cp.id}>
                          {item.company.name} / {item.product.name}: {dutyLabel}{" "}
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
    </Modal>
  );
};

export default TripPlannerModal;
