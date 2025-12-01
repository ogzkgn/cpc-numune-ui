import { useEffect, useMemo, useState } from "react";
import { Send } from "lucide-react";

import Button from "../../components/ui/Button";
import Table from "../../components/ui/Table";
import Modal from "../../components/ui/Modal";
import { useAppStore } from "../../state/useAppStore";
import { formatDate } from "../../utils/date";
import type { TableColumn } from "../../components/ui/Table";
import { generateLabEntryCode } from "../../utils/samples";
import type { LabShipmentDetails } from "../../types";

type SampleRow = {
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
};

const TripSamplesPanel = () => {
  const pendingSamples = useAppStore((state) => state.pendingSamples);
  const loadPendingSamples = useAppStore((state) => state.loadPendingSamples);
  const tripItems = useAppStore((state) => state.tripItems);
  const labs = useAppStore((state) => state.labs);
  const updateTripItemLabStatus = useAppStore((state) => state.updateTripItemLabStatus);
  const addToast = useAppStore((state) => state.addToast);

  const createEmptyLabForm = (): LabShipmentDetails => ({
    sealNo: "",
    weight: "",
    cpcNote: ""
  });

  const [activeRow, setActiveRow] = useState<SampleRow | null>(null);
  const [labForm, setLabForm] = useState<LabShipmentDetails>(createEmptyLabForm);
  const [selectedLabId, setSelectedLabId] = useState<number | "">("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPendingSamples();
  }, [loadPendingSamples]);

  const handleSendToLab = (row: SampleRow) => {
    setActiveRow(row);
    setSelectedLabId("");
    setLabForm(createEmptyLabForm());
    setSaving(false);
  };

  const pendingEntryCode = useMemo(
    () =>
      activeRow?.trackingCode ??
      (activeRow
        ?
            generateLabEntryCode({
              productCode: activeRow.productCode,
              performedAt: activeRow.performedAt,
              tripItems,
              excludeTripItemId: activeRow.tripItemId
            }) ?? undefined
        : undefined),
    [activeRow, tripItems]
  );

  const columns: TableColumn<SampleRow>[] = [
    {
      id: "company",
      header: "Firma",
      cell: (row) => row.companyName
    },
    {
      id: "btCode",
      header: "BT Kod",
      cell: (row) => row.companyBtCode ?? "-"
    },
    {
      id: "product",
      header: "Ürün",
      cell: (row) => row.productName
    },
    {
      id: "location",
      header: "İl / İlçe",
      cell: (row) => row.location ?? "-"
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
        <Button size="sm" variant="ghost" icon={<Send className="h-4 w-4" />} onClick={() => handleSendToLab(row)}>
          Lab'a Gönder
        </Button>
      )
    }
  ];

  const resetModal = () => {
    setActiveRow(null);
    setSelectedLabId("");
    setLabForm(createEmptyLabForm());
    setSaving(false);
  };

  const handleSubmit = async () => {
    if (!activeRow || selectedLabId === "" || !pendingEntryCode) return;
    const seal = labForm.sealNo.trim();
    if (!seal) {
      addToast({ title: "Mühür numarası gerekli", variant: "error" });
      return;
    }

    setSaving(true);
    await updateTripItemLabStatus(activeRow.tripItemId, "SUBMITTED", {
      sentAt: new Date().toISOString(),
      shipment: { ...labForm, sealNo: seal },
      labId: Number(selectedLabId),
      labEntryCode: pendingEntryCode
    });
    await loadPendingSamples();
    addToast({ title: "Numune laboratuvara gönderildi", description: "Gönderim bilgileri kaydedildi.", variant: "info" });
    resetModal();
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <Table columns={columns} data={pendingSamples} keyExtractor={(row) => row.tripItemId} emptyState="Gösterilecek numune kaydı yok" />
      <Modal
        open={activeRow !== null}
        onClose={resetModal}
        title="Laboratuvara Gönderim"
        description="Numuneyi laboratuvara göndermeden önce gerekli bilgileri girin."
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={resetModal}>
              Vazgeç
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                !activeRow ||
                selectedLabId === "" ||
                !pendingEntryCode ||
                !labForm.sealNo.trim() ||
                saving
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
            Mühür No
            <input
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={labForm.sealNo}
              onChange={(event) => setLabForm((prev) => ({ ...prev, sealNo: event.target.value }))}
              placeholder="Örn. MH-2456"
            />
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
          <label className="md:col-span-2 flex flex-col gap-1 text-sm font-medium text-slate-700">
            CPC Notu
            <textarea
              className="min-h-[96px] rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={labForm.cpcNote ?? ""}
              onChange={(event) => setLabForm((prev) => ({ ...prev, cpcNote: event.target.value }))}
              placeholder="Laboratuvara iletilecek notu yazın"
            />
          </label>
        </div>
      </Modal>
    </div>
  );
};

export default TripSamplesPanel;
