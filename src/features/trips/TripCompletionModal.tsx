import { useEffect, useMemo, useState } from "react";

import Modal from "../../components/ui/Modal";
import Button from "../../components/ui/Button";
import { useAppStore } from "../../state/useAppStore";
import { useEntityMaps } from "../../hooks/useEntityMaps";
import { generateLabEntryCode } from "../../utils/samples";
import type {
  LodgingProvider,
  TransportMode,
  Trip,
  TripCompletionEntry,
  TripDutyType,
  TripItem
} from "../../types";

type EntryFormState = {
  trackingCode?: string;
  tripItemId: number;
  performedAt: string;
  inspectionDate: string;
  sampleNotCompleted: boolean;
  inspectionNotCompleted: boolean;
  lodgingPaymentAmount: string;
  transportExpense: string;
  mealLunchExpense: string;
  mealDinnerExpense: string;
  companyExpense: string;
};

type TripCompletionFormState = {
  completedBy: number[];
  transportMode: TransportMode | "";
  vehiclePlate: string;
  totalKm: string;
  totalDays: string;
  lodgingProvider: LodgingProvider | "";
  entries: EntryFormState[];
};

const createEmptyFormState = (): TripCompletionFormState => ({
  completedBy: [],
  transportMode: "",
  vehiclePlate: "",
  totalKm: "",
  totalDays: "",
  lodgingProvider: "",
  entries: []
});

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

const dutyTypeLabels: Record<TripDutyType, string> = {
  NUMUNE: "Numune",
  "GÖZETİM": "Gözetim",
  BOTH: "Gözetim + Numune"
};

const toCurrencyInput = (value: number | undefined) => (typeof value === "number" ? String(value) : "");

interface TripCompletionModalProps {
  tripId: number | null;
  open: boolean;
  onClose: () => void;
}

const TripCompletionModal = ({ tripId, open, onClose }: TripCompletionModalProps) => {
  const trips = useAppStore((state) => state.trips);
  const employees = useAppStore((state) => state.employees);
  const companyProducts = useAppStore((state) => state.companyProducts);
  const tripItems = useAppStore((state) => state.tripItems);
  const tripCompletions = useAppStore((state) => state.tripCompletions);
  const completeTrip = useAppStore((state) => state.completeTrip);
  const { companyMap, siteMap, productMap } = useEntityMaps();
  const employeeMap = useMemo(() => new Map(employees.map((employee) => [employee.id, employee])), [employees]);

  const [formState, setFormState] = useState<TripCompletionFormState>(createEmptyFormState());
  const [error, setError] = useState<string | null>(null);

  const trip = useMemo<Trip | undefined>(() => trips.find((item) => item.id === tripId), [trips, tripId]);
  const relatedTripItems = useMemo<TripItem[]>(
    () => (trip ? tripItems.filter((item) => item.tripId === trip.id) : []),
    [tripItems, trip]
  );
  const tripItemById = useMemo(() => new Map(relatedTripItems.map((item) => [item.id, item])), [relatedTripItems]);
  const existingCompletion = useMemo(
    () => (trip ? tripCompletions.find((entry) => entry.tripId === trip.id) : undefined),
    [tripCompletions, trip]
  );

  useEffect(() => {
    if (!open || !trip) {
      setFormState(createEmptyFormState());
      setError(null);
      return;
    }

    const entries: EntryFormState[] = relatedTripItems.map((item) => {
      const existingEntry = existingCompletion?.entries.find((entry) => entry.tripItemId === item.id);
      const dutyType: TripDutyType = item?.dutyType ?? existingEntry?.dutyType ?? "NUMUNE";
      const requiresSample = dutyType === "NUMUNE" || dutyType === "BOTH";
      const requiresInspection = dutyType === "GÖZETİM" || dutyType === "BOTH";

      return {
        tripItemId: item.id,
        performedAt: requiresSample ? existingEntry?.performedAt ?? "" : "",
        inspectionDate: requiresInspection ? existingEntry?.inspectedAt ?? "" : "",
        sampleNotCompleted: requiresSample ? existingEntry?.sampleNotCompleted ?? false : false,
        inspectionNotCompleted: requiresInspection ? existingEntry?.inspectionNotCompleted ?? false : false,
        lodgingPaymentAmount: toCurrencyInput(existingEntry?.lodgingPaymentAmount),
        transportExpense: toCurrencyInput(existingEntry?.transportExpense),
        mealLunchExpense: toCurrencyInput(existingEntry?.mealLunchExpense),
        mealDinnerExpense: toCurrencyInput(existingEntry?.mealDinnerExpense),
        companyExpense: toCurrencyInput(existingEntry?.companyExpense),
        trackingCode: existingEntry?.trackingCode
      };
    });

    setFormState({
      completedBy: existingCompletion?.completedByEmployeeIds ?? trip.assigneeIds,
      transportMode: existingCompletion?.transportMode ?? "",
      vehiclePlate: existingCompletion?.vehiclePlate ?? "",
      totalKm: existingCompletion?.totalKm ? String(existingCompletion.totalKm) : "",
      totalDays: existingCompletion?.totalDays ? String(existingCompletion.totalDays) : "",
      lodgingProvider: existingCompletion?.lodgingProvider ?? "",
      entries
    });
    setError(null);
  }, [open, trip, relatedTripItems, existingCompletion]);

  const assignedEmployees = useMemo(
    () => (trip ? employees.filter((employee) => trip.assigneeIds.includes(employee.id)) : []),
    [employees, trip]
  );

  const isCompanyVehicle = formState.transportMode === "COMPANY_VEHICLE";
  const requiresDistanceInfo =
    formState.transportMode === "COMPANY_VEHICLE" ||
    formState.transportMode === "BUS" ||
    formState.transportMode === "PLANE" ||
    formState.transportMode === "TRAIN";

  const handleToggleEmployee = (employeeId: number) => {
    setFormState((prev) => {
      const selected = prev.completedBy.includes(employeeId)
        ? prev.completedBy.filter((id) => id !== employeeId)
        : [...prev.completedBy, employeeId];
      return { ...prev, completedBy: selected };
    });
    setError(null);
  };

  const handleEntryChange = (
    tripItemId: number,
    field: Exclude<keyof EntryFormState, "sampleNotCompleted" | "inspectionNotCompleted">,
    value: string
  ) => {
    setFormState((prev) => ({
      ...prev,
      entries: prev.entries.map((entry) =>
        entry.tripItemId === tripItemId
          ? {
              ...entry,
              [field]: value
            }
          : entry
      )
    }));
    setError(null);
  };

  const handleEntryFlagChange = (
    tripItemId: number,
    field: "sampleNotCompleted" | "inspectionNotCompleted",
    value: boolean
  ) => {
    setFormState((prev) => ({
      ...prev,
      entries: prev.entries.map((entry) =>
        entry.tripItemId === tripItemId
          ? {
              ...entry,
              [field]: value,
              ...(field === "sampleNotCompleted" && value ? { performedAt: "" } : {}),
              ...(field === "inspectionNotCompleted" && value ? { inspectionDate: "" } : {})
            }
          : entry
      )
    }));
    setError(null);
  };

  const parseAmount = (value: string) => {
    if (!value) return undefined;
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  const isFormValid = () => {
    if (!trip) return false;
    if (!formState.completedBy.length) return false;
    if (!formState.transportMode) return false;
    if (!formState.lodgingProvider) return false;
    if (isCompanyVehicle && !formState.vehiclePlate.trim()) return false;
    if (requiresDistanceInfo && (!formState.totalKm || !formState.totalDays)) return false;

    return formState.entries.every((entry) => {
      const dutyType = tripItemById.get(entry.tripItemId)?.dutyType ?? "NUMUNE";
      const requiresSample = dutyType === "NUMUNE" || dutyType === "BOTH";
      const requiresInspection = dutyType === "GÖZETİM" || dutyType === "BOTH";
      if (requiresSample && !entry.sampleNotCompleted && !entry.performedAt) return false;
      if (requiresInspection && !entry.inspectionNotCompleted && !entry.inspectionDate) return false;
      return true;
    });
  };

  const handleSubmit = () => {
    if (!trip) return;
    if (!isFormValid()) {
      setError("Lütfen zorunlu alanları doldurun.");
      return;
    }

    const payloadEntries: TripCompletionEntry[] = formState.entries.map((entry) => {
      const tripItem = tripItemById.get(entry.tripItemId);
      const dutyType: TripDutyType = tripItem?.dutyType ?? "NUMUNE";
      const dutyAssigneeIds =
        tripItem?.dutyAssigneeIds && tripItem.dutyAssigneeIds.length > 0
          ? tripItem.dutyAssigneeIds
          : trip?.assigneeIds ?? [];

      const companyProduct = tripItem
        ? companyProducts.find((product) => product.id === tripItem.companyProductId)
        : undefined;
      const requiresSample = dutyType === "NUMUNE" || dutyType === "BOTH";
      const trackingCode =
        requiresSample && !entry.sampleNotCompleted && entry.performedAt
          ? generateLabEntryCode({
              productCode: companyProduct?.productCode,
              performedAt: entry.performedAt,
              tripItems,
              excludeTripItemId: entry.tripItemId
            })
          : undefined;

      return {
        tripItemId: entry.tripItemId,
        dutyType,
        dutyAssigneeIds,
        performedAt: entry.sampleNotCompleted ? undefined : entry.performedAt || undefined,
        inspectedAt: entry.inspectionNotCompleted ? undefined : entry.inspectionDate || undefined,
        sampleNotCompleted: entry.sampleNotCompleted || undefined,
        inspectionNotCompleted: entry.inspectionNotCompleted || undefined,
        trackingCode,
        lodgingPaymentAmount: parseAmount(entry.lodgingPaymentAmount),
        transportExpense: parseAmount(entry.transportExpense),
        mealLunchExpense: parseAmount(entry.mealLunchExpense),
        mealDinnerExpense: parseAmount(entry.mealDinnerExpense),
        companyExpense: parseAmount(entry.companyExpense)
      };
    });

    const totalKmValue = formState.totalKm ? Number(formState.totalKm) : undefined;
    const totalDaysValue = formState.totalDays ? Number(formState.totalDays) : undefined;

    completeTrip({
      tripId: trip.id,
      completedByEmployeeIds: formState.completedBy,
      transportMode: formState.transportMode as TransportMode,
      vehiclePlate: isCompanyVehicle ? formState.vehiclePlate || undefined : undefined,
      totalKm: requiresDistanceInfo ? totalKmValue : undefined,
      totalDays: requiresDistanceInfo ? totalDaysValue : undefined,
      lodgingProvider: formState.lodgingProvider || undefined,
      entries: payloadEntries
    });
    onClose();
  };

  const entryViews = useMemo(() => {
    return formState.entries.map((entry) => {
      const tripItem = relatedTripItems.find((item) => item.id === entry.tripItemId);
      const cp = tripItem ? companyProducts.find((item) => item.id === tripItem.companyProductId) : undefined;
      const company = cp ? companyMap.get(cp.companyId) : undefined;
      const product = cp ? productMap.get(cp.productId) : undefined;
      const site = cp?.siteId ? siteMap.get(cp.siteId) : undefined;
      const dutyType: TripDutyType = tripItem?.dutyType ?? "NUMUNE";
      const dutyAssigneeIds =
        tripItem?.dutyAssigneeIds && tripItem.dutyAssigneeIds.length > 0
          ? tripItem.dutyAssigneeIds
          : existingCompletion?.entries.find((item) => item.tripItemId === entry.tripItemId)?.dutyAssigneeIds ?? [];
      const dutyAssignees = dutyAssigneeIds
        .map((id) => employeeMap.get(id))
        .filter((value): value is typeof employees[number] => Boolean(value));
      const requiresSample = dutyType === "NUMUNE" || dutyType === "BOTH";
      const requiresInspection = dutyType === "GÖZETİM" || dutyType === "BOTH";

      return {
        entry,
        tripItem,
        company,
        product,
        site,
        companyProduct: cp,
        dutyType,
        dutyAssigneeIds,
        dutyAssignees,
        requiresSample,
        requiresInspection
      };
    });
  }, [
    formState.entries,
    relatedTripItems,
    companyProducts,
    companyMap,
    productMap,
    siteMap,
    existingCompletion,
    employeeMap
  ]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Seyahat Tamamlama Formu"
      size="xl"
      className="max-w-7xl"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Vazgeç
          </Button>
          <Button onClick={handleSubmit} disabled={!trip}>
            Kaydet ve Tamamla
          </Button>
        </div>
      }
    >
      {!trip ? (
        <p className="text-sm text-slate-500">Formu doldurmak için bir seyahat seçin.</p>
      ) : (
        <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1">
          <section className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-semibold text-slate-700">Planı Gerçekleştiren Personel</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {assignedEmployees.map((employee) => (
                  <label key={employee.id} className="flex items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={formState.completedBy.includes(employee.id)}
                      onChange={() => handleToggleEmployee(employee.id)}
                    />
                    {employee.name}
                  </label>
                ))}
                {assignedEmployees.length === 0 ? (
                  <p className="text-xs text-slate-500">Bu seyahate atanan personel bulunmuyor.</p>
                ) : null}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-700">Ulaşım Türü</h3>
                <div className="mt-3 grid gap-2">
                  {transportOptions.map((option) => (
                    <label key={option.value} className="flex items-center gap-2 text-sm text-slate-600">
                      <input
                        type="radio"
                        name="transportMode"
                        className="h-4 w-4"
                        value={option.value}
                        checked={formState.transportMode === option.value}
                        onChange={(event) => {
                          const nextMode = event.target.value as TransportMode;
                          setFormState((prev) => {
                            const previousMode = prev.transportMode;
                            const shouldResetDistance = previousMode !== nextMode;
                            return {
                              ...prev,
                              transportMode: nextMode,
                              vehiclePlate: nextMode === "COMPANY_VEHICLE" ? prev.vehiclePlate : "",
                              totalKm: shouldResetDistance ? "" : prev.totalKm,
                              totalDays: shouldResetDistance ? "" : prev.totalDays
                            };
                          });
                          setError(null);
                        }}
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-700">Konaklama</h3>
                <div className="mt-3 grid gap-2">
                  {lodgingOptions.map((option) => (
                    <label key={option.value} className="flex items-center gap-2 text-sm text-slate-600">
                      <input
                        type="radio"
                        name="lodgingProvider"
                        className="h-4 w-4"
                        value={option.value}
                        checked={formState.lodgingProvider === option.value}
                        onChange={(event) =>
                          setFormState((prev) => ({
                            ...prev,
                            lodgingProvider: event.target.value as LodgingProvider
                          }))
                        }
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </div>
              {isCompanyVehicle ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                    Araç Plaka No
                    <input
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      value={formState.vehiclePlate}
                      onChange={(event) => setFormState((prev) => ({ ...prev, vehiclePlate: event.target.value }))}
                      placeholder="34 CPC 123"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                    Toplam Yapılan KM
                    <input
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      value={formState.totalKm}
                      onChange={(event) => setFormState((prev) => ({ ...prev, totalKm: event.target.value }))}
                      type="number"
                      min="0"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                    Toplam Gün
                    <input
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      value={formState.totalDays}
                      onChange={(event) => setFormState((prev) => ({ ...prev, totalDays: event.target.value }))}
                      type="number"
                      min="0"
                    />
                  </label>
                </div>
              ) : null}
              {!isCompanyVehicle && requiresDistanceInfo ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                    Toplam Yapılan KM
                    <input
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      value={formState.totalKm}
                      onChange={(event) => setFormState((prev) => ({ ...prev, totalKm: event.target.value }))}
                      type="number"
                      min="0"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                    Toplam Gün
                    <input
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      value={formState.totalDays}
                      onChange={(event) => setFormState((prev) => ({ ...prev, totalDays: event.target.value }))}
                      type="number"
                      min="0"
                    />
                  </label>
                </div>
              ) : null}
            </div>
          </section>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-700">Firma / Ürün Bilgileri</h3>
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-xs md:text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-left text-slate-600">
                    <th className="px-3 py-2">Firma / Tesis</th>
                    <th className="px-3 py-2">İlçe / İl</th>
                    <th className="px-3 py-2">Kapsam</th>
                    <th className="px-3 py-2">Görev Bilgisi</th>
                    <th className="px-3 py-2">Numune Tarihi</th>
                    <th className="px-3 py-2">Gözetim Tarihi</th>
                    <th className="px-3 py-2">Konaklama Ödeme</th>
                    <th className="px-3 py-2">Ulaşım Masrafı</th>
                    <th className="px-3 py-2">Öğlen</th>
                    <th className="px-3 py-2">Akşam</th>
                    <th className="px-3 py-2">Firma Masrafı</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {entryViews.map(({ entry, company, product, site, dutyType, dutyAssignees, requiresSample, requiresInspection }) => (
                    <tr key={entry.tripItemId} className="align-top">
                      <td className="px-3 py-2 text-slate-700">
                        {company?.name ?? "-"}
                        {site ? ` / ${site.address ?? site.city}` : ""}
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        {site ? (site.district ? `${site.district} / ${site.city}` : site.city) : "-"}
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        {product?.groupName ?? product?.productType ?? "-"}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-semibold text-slate-800">{dutyTypeLabels[dutyType]}</span>
                          {dutyAssignees.length > 0 ? (
                            <span className="text-[11px] text-slate-500">
                              {dutyAssignees.map((assignee) => assignee.name).join(", ")}
                            </span>
                          ) : (
                            <span className="text-[11px] text-red-600">Planlamada ekip atanmadı</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        {requiresSample ? (
                          <div className="space-y-2">
                            <input
                              type="date"
                              className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs md:text-sm"
                              value={entry.performedAt}
                              disabled={entry.sampleNotCompleted}
                              onChange={(event) =>
                                handleEntryChange(entry.tripItemId, "performedAt", event.target.value)
                              }
                            />
                            <label className="flex items-center gap-2 text-xs text-slate-600">
                              <input
                                type="checkbox"
                                className="h-4 w-4"
                                checked={entry.sampleNotCompleted}
                                onChange={(event) =>
                                  handleEntryFlagChange(entry.tripItemId, "sampleNotCompleted", event.target.checked)
                                }
                              />
                              Numune tamamlanmadı
                            </label>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">Numune görevi için tarih gerekmiyor</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {requiresInspection ? (
                          <div className="space-y-2">
                            <input
                              type="date"
                              className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs md:text-sm"
                              value={entry.inspectionDate}
                              disabled={entry.inspectionNotCompleted}
                              onChange={(event) =>
                                handleEntryChange(entry.tripItemId, "inspectionDate", event.target.value)
                              }
                            />
                            <label className="flex items-center gap-2 text-xs text-slate-600">
                              <input
                                type="checkbox"
                                className="h-4 w-4"
                                checked={entry.inspectionNotCompleted}
                                onChange={(event) =>
                                  handleEntryFlagChange(
                                    entry.tripItemId,
                                    "inspectionNotCompleted",
                                    event.target.checked
                                  )
                                }
                              />
                              Gözetim tamamlanmadı
                            </label>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">Gözetim görevi için tarih gerekmiyor</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs md:text-sm"
                          value={entry.lodgingPaymentAmount}
                          onChange={(event) =>
                            handleEntryChange(entry.tripItemId, "lodgingPaymentAmount", event.target.value)
                          }
                          placeholder="₺"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs md:text-sm"
                          value={entry.transportExpense}
                          onChange={(event) =>
                            handleEntryChange(entry.tripItemId, "transportExpense", event.target.value)
                          }
                          placeholder="₺"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs md:text-sm"
                          value={entry.mealLunchExpense}
                          onChange={(event) =>
                            handleEntryChange(entry.tripItemId, "mealLunchExpense", event.target.value)
                          }
                          placeholder="₺"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs md:text-sm"
                          value={entry.mealDinnerExpense}
                          onChange={(event) =>
                            handleEntryChange(entry.tripItemId, "mealDinnerExpense", event.target.value)
                          }
                          placeholder="₺"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs md:text-sm"
                          value={entry.companyExpense}
                          onChange={(event) =>
                            handleEntryChange(entry.tripItemId, "companyExpense", event.target.value)
                          }
                          placeholder="₺"
                        />
                      </td>
                    </tr>
                  ))}
                  {entryViews.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="px-3 py-4 text-center text-sm text-slate-500">
                        Bu seyahat için ilişkilendirilmiş firma-ürün kaydı bulunmuyor.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500">* işaretli alanların doldurulması zorunludur.</p>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
          </div>
        </div>
      )}
    </Modal>
  );
};

export default TripCompletionModal;






