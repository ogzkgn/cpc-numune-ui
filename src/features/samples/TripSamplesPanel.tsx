
import { useState, useMemo } from "react";
import { Send } from "lucide-react";

import Button from "../../components/ui/Button";
import Table from "../../components/ui/Table";
import Modal from "../../components/ui/Modal";
import { useAppStore } from "../../state/useAppStore";
import { useEntityMaps } from "../../hooks/useEntityMaps";
import { formatDate } from "../../utils/date";
import type { TableColumn } from "../../components/ui/Table";
import { generateLabEntryCode } from "../../utils/samples";
import type { Trip, TripItem, LabShipmentDetails } from "../../types";

type SampleRow = {
  tripId: number;
  tripItem: TripItem;
  companyName: string;
  productName: string;
  productCode?: string;
  location: string;
  performedAt: string;
  trackingCode?: string;
};

const TripSamplesPanel = () => {
  const trips = useAppStore((state) => state.trips);
  const tripItems = useAppStore((state) => state.tripItems);
  const tripCompletions = useAppStore((state) => state.tripCompletions);
  const companyProducts = useAppStore((state) => state.companyProducts);
  const labs = useAppStore((state) => state.labs);
  const updateTripItemLabStatus = useAppStore((state) => state.updateTripItemLabStatus);
  const addToast = useAppStore((state) => state.addToast);
  const { companyMap, productMap, siteMap } = useEntityMaps();

  const createEmptyLabForm = (): LabShipmentDetails => ({
    productionDate: "",
    lastSaleDate: "",
    storage: "",
    sealNo: "",
    foreignMatter: "Yok",
    weight: ""
  });

  const companyProductMap = useMemo(() => new Map(companyProducts.map((cp) => [cp.id, cp])), [companyProducts]);


  const [activeRow, setActiveRow] = useState<SampleRow | null>(null);
  const [labForm, setLabForm] = useState<LabShipmentDetails>(createEmptyLabForm);
  const [selectedLabId, setSelectedLabId] = useState<number | "">("");

  const rows = useMemo<SampleRow[]>(() => {
    const tripMap = new Map<number, Trip>();
    trips.forEach((trip) => {
      tripMap.set(trip.id, trip);
    });

    const tripItemMap = new Map<number, TripItem>();
    tripItems.forEach((item) => {
      tripItemMap.set(item.id, item);
    });

    const collectedRows: SampleRow[] = [];

    tripCompletions.forEach((completion) => {
      const trip = tripMap.get(completion.tripId);
      if (!trip || trip.status !== "COMPLETED") return;

      completion.entries.forEach((entry) => {
        const tripItem = tripItemMap.get(entry.tripItemId);
        if (!tripItem) return;

        const dutyType = entry.dutyType ?? tripItem.dutyType;
        const isSamplingDuty = dutyType === "NUMUNE" || dutyType === "BOTH";
        if (!isSamplingDuty || !entry.performedAt) return;
        if (tripItem.labStatus && tripItem.labStatus !== "PENDING") return;

        const companyProduct = companyProductMap.get(tripItem.companyProductId);
        const company = companyProduct ? companyMap.get(companyProduct.companyId) : undefined;
        const product = companyProduct ? productMap.get(companyProduct.productId) : undefined;
        const site = companyProduct?.siteId ? siteMap.get(companyProduct.siteId) : undefined;

        const trackingCode =
          entry.trackingCode ??
          generateLabEntryCode({
            productCode: companyProduct?.productCode,
            performedAt: entry.performedAt,
            tripItems,
            excludeTripItemId: tripItem.id
          }) ??
          undefined;

        collectedRows.push({
          tripId: trip.id,
          tripItem,
          companyName: company?.name ?? "-",
          productName: product
            ? `${product.name}${product.standardNo ? ` (${product.standardNo})` : ""}`
            : "-",
          productCode: companyProduct?.productCode,
          location:
            site && site.city ? (site.district ? `${site.city} / ${site.district}` : site.city) : "-",
          performedAt: entry.performedAt,
          trackingCode
        });
      });
    });

    return collectedRows;
  }, [trips, tripItems, tripCompletions, companyProducts, companyMap, productMap, siteMap]);

  const handleSendToLab = (row: SampleRow) => {
    setActiveRow(row);
    setSelectedLabId("");
    setLabForm(createEmptyLabForm());
  };

  const pendingEntryCode =
    activeRow?.trackingCode ??
    (activeRow
      ? generateLabEntryCode({
          productCode: activeRow.productCode,
          performedAt: activeRow.performedAt,
          tripItems,
          excludeTripItemId: activeRow.tripItem.id
        }) ?? undefined
      : undefined);

  const columns: TableColumn<SampleRow>[] = [
    {
      id: "company",
      header: "Firma",
      cell: (row) => row.companyName
    },
    {
      id: "product",
      header: "Ürün",
      cell: (row) => row.productName
    },
    {
      id: "location",
      header: "İl / İlçe",
      cell: (row) => row.location
    },
    {
      id: "labEntry",
      header: "Takip No",
      cell: (row) => row.trackingCode ?? "-"
    },
    {
      id: "date",
      header: "Numune Alınma Tarihi",
      cell: (row) => formatDate(row.performedAt)
    },
    {
      id: "actions",
      header: "",
      width: "140px",
      cell: (row) => (
        <Button
          size="sm"
          variant="ghost"
          icon={<Send className="h-4 w-4" />}
          onClick={() => handleSendToLab(row)}
        >
          Lab'a Gönder
        </Button>
      )
    }
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      
      <Table
        columns={columns}
        data={rows}
        keyExtractor={(row) => row.tripItem.id}
        emptyState="Gösterilecek numune kaydı yok"
      />
      <Modal
        open={activeRow !== null}
        onClose={() => {
          setActiveRow(null);
          setSelectedLabId("");
          setLabForm(createEmptyLabForm());
        }}
        title="Laboratuvara Gönderim"
        description="Numuneyi laboratuvara göndermeden önce gerekli bilgileri girin."
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setActiveRow(null);
                setSelectedLabId("");
                setLabForm(createEmptyLabForm());
              }}
            >
              Vazgeç
            </Button>
            <Button
              onClick={() => {
                if (!activeRow || selectedLabId === "") return;
                const labEntryCode = pendingEntryCode;
                if (!labEntryCode) {
                  addToast({
                    title: "Lab giriş numarası oluşturulamadı",
                    description: "Lütfen ürün kodu ve numune tarihini kontrol edin.",
                    variant: "error"
                  });
                  return;
                }
                updateTripItemLabStatus(activeRow.tripItem.id, "SUBMITTED", {
                  sentAt: new Date().toISOString(),
                  shipment: labForm,
                  labId: Number(selectedLabId),
                  labEntryCode
                });
                addToast({
                  title: "Numune laboratuvara gönderildi",
                  description: "Gönderim bilgileri kaydedildi.",
                  variant: "info"
                });
                setActiveRow(null);
                setSelectedLabId("");
                setLabForm(createEmptyLabForm());
              }}
              disabled={
                !activeRow ||
                selectedLabId === "" ||
                !pendingEntryCode ||
                !labForm.productionDate ||
                !labForm.lastSaleDate ||
                !labForm.storage ||
                !labForm.sealNo
              }
            >
              Gönder
            </Button>
          </div>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 md:col-span-2">
            Laboratuvar
            <select
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={selectedLabId}
              onChange={(event) => setSelectedLabId(event.target.value ? Number(event.target.value) : "")}
            >
              <option value="">Laboratuvar seçin</option>
              {labs.map((lab) => (
                <option key={lab.id} value={lab.id}>
                  {lab.name}
                </option>
              ))}
            </select>
          </label>
          <div className="md:col-span-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-600">
            <span className="font-medium text-slate-700">Takip No: </span>
            {pendingEntryCode ?? "-"}
          </div>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Üretim Tarihi
            <input
              type="date"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={labForm.productionDate}
              onChange={(event) => setLabForm((prev) => ({ ...prev, productionDate: event.target.value }))}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Son Satış Tarihi
            <input
              type="date"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={labForm.lastSaleDate}
              onChange={(event) => setLabForm((prev) => ({ ...prev, lastSaleDate: event.target.value }))}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Silo / Depo No
            <input
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={labForm.storage}
              onChange={(event) => setLabForm((prev) => ({ ...prev, storage: event.target.value }))}
              placeholder="Örn. Silo 3"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Mühür No
            <input
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={labForm.sealNo}
              onChange={(event) => setLabForm((prev) => ({ ...prev, sealNo: event.target.value }))}
              placeholder="Örn. MH-2456"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Yabancı Madde Mevcudiyeti
            <select
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={labForm.foreignMatter}
              onChange={(event) => setLabForm((prev) => ({ ...prev, foreignMatter: event.target.value }))}
            >
              <option>Yok</option>
              <option>Var</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Numune Ağırlığı (kg)
            <input
              type="number"
              min="0"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={labForm.weight}
              onChange={(event) => setLabForm((prev) => ({ ...prev, weight: event.target.value }))}
              placeholder="Örn. 500"
            />
          </label>
        </div>
      </Modal>
    </div>
  );
};

export default TripSamplesPanel;











