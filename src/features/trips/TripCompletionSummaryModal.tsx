import Modal from "../../components/ui/Modal";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import { useAppStore } from "../../state/useAppStore";
import { useEntityMaps } from "../../hooks/useEntityMaps";
import { formatDate } from "../../utils/date";
import { generateLabEntryCode } from "../../utils/samples";
import type { TripCompletion, TripDutyType } from "../../types";

const transportLabels: Record<TripCompletion["transportMode"], string> = {
  COMPANY_VEHICLE: "Şirket Aracı",
  BUS: "Otobüs",
  PLANE: "Uçak",
  TRAIN: "Tren"
};

const lodgingLabels = {
  COMPANY: "Firma Tarafından",
  CPC: "CPC Tarafından"
} as const;

const dutyTypeLabels: Record<TripDutyType, string> = {
  NUMUNE: "Numune",
  "GÖZETİM": "Gözetim",
  BOTH: "Gözetim + Numune"
};

const formatCurrency = (value?: number) => {
  if (value === undefined || value === null) return "-";
  return new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

interface TripCompletionSummaryModalProps {
  tripId: number | null;
  open: boolean;
  onClose: () => void;
  mode?: "detail" | "pdf";
}

const TripCompletionSummaryModal = ({ tripId, open, onClose, mode = "detail" }: TripCompletionSummaryModalProps) => {
  const trips = useAppStore((state) => state.trips);
  const employees = useAppStore((state) => state.employees);
  const tripCompletions = useAppStore((state) => state.tripCompletions);
  const tripItems = useAppStore((state) => state.tripItems);
  const { companyProductMap, companyMap, siteMap, productMap } = useEntityMaps();

  const trip = tripId ? trips.find((item) => item.id === tripId) : undefined;
  const completion = tripId ? tripCompletions.find((entry) => entry.tripId === tripId) : undefined;

  const participantNames =
    completion?.completedByEmployeeIds
      .map((id) => employees.find((employee) => employee.id === id)?.name)
      .filter((value): value is string => Boolean(value)) ?? [];

  const enrichedEntries =
    completion?.entries.map((entry) => {
      const tripItem = tripItems.find((item) => item.id === entry.tripItemId);
      const cp = tripItem ? companyProductMap.get(tripItem.companyProductId) : undefined;
      const company = cp ? companyMap.get(cp.companyId) : undefined;
      const product = cp ? productMap.get(cp.productId) : undefined;
      const site = cp?.siteId ? siteMap.get(cp.siteId) : undefined;
      const dutyType: TripDutyType = entry.dutyType ?? tripItem?.dutyType ?? "NUMUNE";
      const dutyAssigneeIds =
        entry.dutyAssigneeIds && entry.dutyAssigneeIds.length > 0
          ? entry.dutyAssigneeIds
          : tripItem?.dutyAssigneeIds ?? [];
      const dutyAssigneeNames = dutyAssigneeIds
        .map((id) => employees.find((employee) => employee.id === id)?.name)
        .filter((value): value is string => Boolean(value));
      const requiresSample = dutyType === "NUMUNE" || dutyType === "BOTH";
      const requiresInspection = dutyType === "GÖZETİM" || dutyType === "BOTH";
      const trackingCode =
        requiresSample && entry.performedAt && !entry.sampleNotCompleted
          ? entry.trackingCode ??
            generateLabEntryCode({
              productCode: cp?.productCode,
              performedAt: entry.performedAt,
              tripItems,
              excludeTripItemId: entry.tripItemId
            }) ??
            "-"
          : "-";

      return {
        entry,
        company,
        product,
        site,
        companyProduct: cp,
        dutyType,
        dutyAssigneeNames,
        requiresSample,
        requiresInspection,
        trackingCode
      };
    }) ?? [];

  const title = trip
    ? mode === "pdf"
      ? `Muhasebe Önizleme - ${trip.name ?? `Seyahat #${trip.id}`}`
      : `Seyahat Tamamlama Özeti - ${trip.name ?? `Seyahat #${trip.id}`}`
    : mode === "pdf"
      ? "Muhasebe Önizleme"
      : "Seyahat Tamamlama Özeti";

  const footer =
    mode === "pdf"
      ? (
        <div className="flex justify-end">
          <Button variant="ghost" onClick={onClose}>
            Kapat
          </Button>
        </div>
      )
      : null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="xl"
      className={mode === "pdf" ? "max-w-6xl" : "max-w-5xl"}
      footer={footer}
    >
      {!completion ? (
        <p className="text-sm text-slate-500">Bu seyahat için kayıtlı tamamlama formu bulunmuyor.</p>
      ) : (
        <div className="max-h-[70vh] overflow-y-auto pr-1">
          <div
            className={mode === "pdf" ? "mx-auto max-w-5xl space-y-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-xl" : "space-y-6"}
          >
            {mode === "pdf" ? (
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Saha Seyahat Formu</h2>
                  <p className="text-xs text-slate-500">
                    Bu önizleme muhasebe departmanı için PDF çıktısı olarak kullanılabilir.
                  </p>
                </div>
                <div className="text-right text-xs text-slate-500">
                  <p>Oluşturulma: {formatDate(new Date().toISOString())}</p>
                  {trip?.plannedAt ? <p>Planlanan Tarih: {formatDate(trip.plannedAt)}</p> : null}
                </div>
              </div>
            ) : null}

            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-semibold text-slate-700">Planı Gerçekleştiren Personel</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {participantNames.length > 0 ? (
                  participantNames.map((name) => (
                    <Badge key={name} variant="neutral">
                      {name}
                    </Badge>
                  ))
                ) : (
                  <p className="text-xs text-slate-500">Bilgi girilmemiş.</p>
                )}
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2 text-sm text-slate-600">
                <h3 className="text-sm font-semibold text-slate-700">Ulaşım</h3>
                <p>
                  <strong>Tür:</strong> {transportLabels[completion.transportMode] ?? completion.transportMode}
                </p>
                {completion.transportMode === "COMPANY_VEHICLE" && completion.vehiclePlate ? (
                  <p>
                    <strong>Araç Plaka No:</strong> {completion.vehiclePlate}
                  </p>
                ) : null}
                {completion.totalKm !== undefined ? (
                  <p>
                    <strong>Toplam KM:</strong> {completion.totalKm}
                  </p>
                ) : null}
                {completion.totalDays !== undefined ? (
                  <p>
                    <strong>Toplam Gün:</strong> {completion.totalDays}
                  </p>
                ) : null}
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2 text-sm text-slate-600">
                <h3 className="text-sm font-semibold text-slate-700">Konaklama</h3>
                <p>
                  <strong>Sağlayan:</strong> {completion.lodgingProvider ? lodgingLabels[completion.lodgingProvider] : "-"}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2 text-sm text-slate-600">
                <h3 className="text-sm font-semibold text-slate-700">Planlama</h3>
                <p>
                  <strong>Planlamayı Yapan:</strong> {trip?.plannedBy || "-"}
                </p>
              </div>
            </section>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-700">Firma / Ürün Bilgileri</h3>
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-xs md:text-sm">
                  <thead className="bg-slate-50 text-left text-slate-600">
                  <tr>
                    <th className="px-3 py-2">BT Kod</th>
                    <th className="px-3 py-2">Ürün Kodu</th>
                    <th className="px-3 py-2">Belge Tarihi</th>
                    <th className="px-3 py-2">Firma / Tesis</th>
                    <th className="px-3 py-2">İlçe / İl</th>
                    <th className="px-3 py-2">Kapsam</th>
                      <th className="px-3 py-2">Görev Bilgisi</th>
                      <th className="px-3 py-2">Numune Tarihi</th>
                      <th className="px-3 py-2">Gözetim Tarihi</th>
                      <th className="px-3 py-2">Takip No</th>
                      <th className="px-3 py-2">Konaklama Ödeme</th>
                      <th className="px-3 py-2">Ulaşım Masrafı</th>
                      <th className="px-3 py-2">Öğlen</th>
                      <th className="px-3 py-2">Akşam</th>
                      <th className="px-3 py-2">Diğer</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {enrichedEntries.map(({ entry, company, site, product, companyProduct, dutyType, dutyAssigneeNames, requiresSample, requiresInspection, trackingCode }) => (
                      <tr key={entry.tripItemId} className="align-top text-slate-700">
                        <td className="px-3 py-2">{company?.customerCode ?? "-"}</td>
                        <td className="px-3 py-2">{companyProduct?.productCode ?? "-"}</td>
                        <td className="px-3 py-2">{formatDate(companyProduct?.certificateDate)}</td>
                        <td className="px-3 py-2">
                          {company?.name ?? "-"}
                          {site?.address ? ` / ${site.address}` : ""}
                        </td>
                        <td className="px-3 py-2">{site ? (site.district ? `${site.district} / ${site.city}` : site.city) : "-"}</td>
                        <td className="px-3 py-2">{product?.groupName ?? product?.productType ?? "-"}</td>
                        <td className="px-3 py-2">
                          <div className="flex flex-col gap-1">
                            <span className="text-sm font-semibold text-slate-800">{dutyTypeLabels[dutyType]}</span>
                            {dutyAssigneeNames.length > 0 ? (
                              <span className="text-[11px] text-slate-500">{dutyAssigneeNames.join(", ")}</span>
                            ) : (
                              <span className="text-[11px] text-slate-400">Ekip atanmadı</span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          {requiresSample ? (
                            entry.sampleNotCompleted ? (
                              <span className="text-xs font-medium text-red-600">Tamamlanmadı</span>
                            ) : entry.performedAt ? (
                              formatDate(entry.performedAt)
                            ) : (
                              "-"
                            )
                          ) : (
                            <span className="text-xs text-slate-400">Gözetim görevi</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {requiresInspection ? (
                            entry.inspectionNotCompleted ? (
                              <span className="text-xs font-medium text-red-600">Tamamlanmadı</span>
                            ) : entry.inspectedAt ? (
                              formatDate(entry.inspectedAt)
                            ) : (
                              "-"
                            )
                          ) : (
                            <span className="text-xs text-slate-400">Numune görevi</span>
                          )}
                        </td>
                        <td className="px-3 py-2">{trackingCode}</td>
                        <td className="px-3 py-2">{formatCurrency(entry.lodgingPaymentAmount)}</td>
                        <td className="px-3 py-2">{formatCurrency(entry.transportExpense)}</td>
                        <td className="px-3 py-2">{formatCurrency(entry.mealLunchExpense)}</td>
                        <td className="px-3 py-2">{formatCurrency(entry.mealDinnerExpense)}</td>
                        <td className="px-3 py-2">{formatCurrency(entry.companyExpense)}</td>
                      </tr>
                    ))}
                    {enrichedEntries.length === 0 ? (
                      <tr>
                        <td colSpan={15} className="px-3 py-4 text-center text-sm text-slate-500">
                          Bu seyahate ait firma-ürün kaydı bulunmuyor.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default TripCompletionSummaryModal;






