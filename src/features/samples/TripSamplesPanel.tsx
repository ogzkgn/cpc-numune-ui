import { useEffect, useMemo, useState } from "react";
import { Filter, RotateCw, Send } from "lucide-react";

import Button from "../../components/ui/Button";
import Table from "../../components/ui/Table";
import Modal from "../../components/ui/Modal";
import Drawer from "../../components/ui/Drawer";
import { useAppStore } from "../../state/useAppStore";
import { formatDate } from "../../utils/date";
import { getProductTypeLabel } from "../../utils/labels";
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
  productType?: string;
};

const TripSamplesPanel = () => {
  const pendingSamples = useAppStore((state) => state.pendingSamples);
  const loadPendingSamples = useAppStore((state) => state.loadPendingSamples);
  const tripItems = useAppStore((state) => state.tripItems);
  const companyProductRecords = useAppStore((state) => state.companyProductRecords);
  const labs = useAppStore((state) => state.labs);
  const loadLabs = useAppStore((state) => state.loadLabs);
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
  const [isFilterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    productTypes: [] as string[],
    city: undefined as string | undefined,
    customerCode: undefined as string | undefined,
    companyName: undefined as string | undefined,
    productCode: undefined as string | undefined,
    productName: undefined as string | undefined,
    performedFrom: undefined as string | undefined
  });

  useEffect(() => {
    loadPendingSamples();
    loadLabs();
  }, [loadPendingSamples, loadLabs]);

  const handleSendToLab = (row: SampleRow) => {
    setActiveRow(row);
    setSelectedLabId("");
    setLabForm(createEmptyLabForm());
    setSaving(false);
  };

  const pendingEntryCode = useMemo(
    () =>
      (activeRow?.trackingCode && !activeRow.trackingCode.startsWith("undefined")
        ? activeRow.trackingCode
        : undefined) ??
      (activeRow
        ?
            generateLabEntryCode({
              productCode: activeRow.productCode,
              btCode: activeRow.companyBtCode,
              performedAt: activeRow.performedAt,
              tripItems,
              companyProductId: activeRow.companyProductId,
              excludeTripItemId: activeRow.tripItemId
            }) ?? undefined
        : undefined),
    [activeRow, tripItems]
  );

  const recordMap = useMemo(() => new Map(companyProductRecords.map((rec) => [rec.id, rec])), [companyProductRecords]);
  const enriched = useMemo(() => {
    return pendingSamples.map((row) => {
      const record = recordMap.get(row.companyProductId);
      return {
        ...row,
        productType: record?.productType
      };
    });
  }, [pendingSamples, recordMap]);

  const availableProductTypes = useMemo(() => {
    const types = new Set<string>();
    enriched.forEach((row) => {
      if (row.productType) types.add(row.productType);
    });
    return Array.from(types);
  }, [enriched]);
  const uniqueCities = useMemo(() => {
    const values = new Set<string>();
    enriched.forEach((row) => {
      if (row.location) values.add(row.location);
    });
    return Array.from(values);
  }, [enriched]);
  const uniqueCompanies = useMemo(() => {
    const values = new Set<string>();
    enriched.forEach((row) => values.add(row.companyName));
    return Array.from(values);
  }, [enriched]);
  const uniqueProductNames = useMemo(() => {
    const values = new Set<string>();
    enriched.forEach((row) => {
      if (row.productName) values.add(row.productName);
    });
    return Array.from(values);
  }, [enriched]);

  const filtered = useMemo(() => {
    let base = enriched;
    if (filters.productTypes.length > 0) {
      base = base.filter((row) => row.productType && filters.productTypes.includes(row.productType));
    }
    if (filters.city) {
      base = base.filter((row) => row.location === filters.city);
    }
    if (filters.customerCode) {
      const q = filters.customerCode.toLowerCase();
      base = base.filter((row) => (row.companyBtCode ?? "-").toLowerCase().includes(q));
    }
    if (filters.companyName) {
      const q = filters.companyName.toLowerCase();
      base = base.filter((row) => row.companyName.toLowerCase().includes(q));
    }
    if (filters.productCode) {
      const q = filters.productCode.toLowerCase();
      base = base.filter((row) => (row.productCode ?? "-").toLowerCase().includes(q));
    }
    if (filters.productName) {
      const q = filters.productName.toLowerCase();
      base = base.filter((row) => (row.productName ?? "").toLowerCase().includes(q));
    }
    if (filters.performedFrom) {
      base = base.filter((row) => row.performedAt && row.performedAt >= filters.performedFrom!);
    }
    return base;
  }, [enriched, filters]);

  const handleResetFilters = () => {
    setFilters({
      productTypes: [],
      city: undefined,
      customerCode: undefined,
      companyName: undefined,
      productCode: undefined,
      productName: undefined,
      performedFrom: undefined
    });
  };

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
      header: "Ürün Kodu",
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
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Numune Gönderimi</h2>
          <p className="text-sm text-slate-500">Laboratuvara gönderilecek numuneleri yönetin.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" icon={<RotateCw className="h-4 w-4" />} onClick={handleResetFilters}>
            Sıfırla
          </Button>
          <Button variant="secondary" size="sm" icon={<Filter className="h-4 w-4" />} onClick={() => setFilterOpen(true)}>
            Filtreler
          </Button>
        </div>
      </div>
      <Table columns={columns} data={filtered} keyExtractor={(row) => row.tripItemId} emptyState="Gösterilecek numune kaydı yok" />
      <Drawer open={isFilterOpen} onClose={() => setFilterOpen(false)} title="Filtreler">
        <div className="space-y-6">
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-700">Ürün Tipi</h3>
            <input
              list="sampleProductTypes"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Ürün tipi seçin veya arayın"
              value={filters.productTypes[0] ? getProductTypeLabel(filters.productTypes[0] as any) : ""}
              onChange={(event) => {
                const label = event.target.value;
                const matched = availableProductTypes.find((type) => getProductTypeLabel(type as any) === label);
                setFilters((prev) => ({
                  ...prev,
                  productTypes: matched ? [matched] : []
                }));
              }}
            />
            <datalist id="sampleProductTypes">
              {availableProductTypes.map((type) => (
                <option key={type} value={getProductTypeLabel(type as any)}>
                  {getProductTypeLabel(type as any)}
                </option>
              ))}
            </datalist>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-700">Şehir</h3>
            <input
              list="sampleCityOptions"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Şehir seçin veya arayın"
              value={filters.city ?? ""}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  city: event.target.value || undefined
                }))
              }
            />
            <datalist id="sampleCityOptions">
              {uniqueCities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </datalist>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-700">BT Kodu</h3>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="BT-.."
              value={filters.customerCode ?? ""}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  customerCode: event.target.value || undefined
                }))
              }
            />
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-700">Firma</h3>
            <input
              list="sampleCompanyOptions"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Firma seçin veya arayın"
              value={filters.companyName ?? ""}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  companyName: event.target.value || undefined
                }))
              }
            />
            <datalist id="sampleCompanyOptions">
              {uniqueCompanies.map((company) => (
                <option key={company} value={company}>
                  {company}
                </option>
              ))}
            </datalist>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-700">Ürün Kodu</h3>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Ürün kodu ara"
              value={filters.productCode ?? ""}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  productCode: event.target.value || undefined
                }))
              }
            />
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-700">Ürün</h3>
            <input
              list="sampleProductNameOptions"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Ürün seçin veya arayın"
              value={filters.productName ?? ""}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  productName: event.target.value || undefined
                }))
              }
            />
            <datalist id="sampleProductNameOptions">
              {uniqueProductNames.map((product) => (
                <option key={product} value={product}>
                  {product}
                </option>
              ))}
            </datalist>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-700">Numune Tarihi (sonrası)</h3>
            <input
              type="date"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={filters.performedFrom ?? ""}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  performedFrom: event.target.value || undefined
                }))
              }
            />
          </section>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={handleResetFilters}>
              Temizle
            </Button>
            <Button onClick={() => setFilterOpen(false)}>Uygula</Button>
          </div>
        </div>
      </Drawer>
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
