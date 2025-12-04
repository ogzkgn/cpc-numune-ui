import { useEffect, useMemo, useState } from "react";

import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Chip from "../../components/ui/Chip";
import Drawer from "../../components/ui/Drawer";
import Modal from "../../components/ui/Modal";
import Table from "../../components/ui/Table";
import { useAppStore } from "../../state/useAppStore";
import { useEntityMaps } from "../../hooks/useEntityMaps";
import { formatDate } from "../../utils/date";
import { labStatusLabels, labStatusTokens, getProductTypeLabel } from "../../utils/labels";
import { SHIPMENT_FIELDS, getFieldConfig } from "./labConstants";
import { Filter, RotateCw } from "lucide-react";
import LabFormDetails from "./components/LabFormDetails";
import type { TableColumn } from "../../components/ui/Table";
import type { LabFormDocument, ProductType, TripItem } from "../../types";

type PendingEntry = {
  item: TripItem;
  companyName: string;
  companyBtCode?: string;
  productName: string;
  productType: ProductType | undefined;
  productStandard: string | undefined;
  productCode: string | undefined;
  labId: number | undefined;
  labEntryCode: string | undefined;
  labSentAt: string | undefined;
  labReturnDays: number | undefined;
  labFormData: Record<string, unknown> | undefined;
  labNotes: string | undefined;
  cpcNotes: string | undefined;
  documents: LabFormDocument[] | undefined;
  companyProductId: number;
  location?: string;
};

const LabProcessingView = () => {
  const tripItems = useAppStore((state) => state.tripItems);
  const labForms = useAppStore((state) => state.labForms);
  const activeRole = useAppStore((state) => state.activeRole);
  const addToast = useAppStore((state) => state.addToast);
  const upsertLabForm = useAppStore((state) => state.upsertLabForm);
  const loadLabItems = useAppStore((state) => state.loadLabItems);
  const loadCompanyProductRecords = useAppStore((state) => state.loadCompanyProductRecords);
  const companyProductRecords = useAppStore((state) => state.companyProductRecords);
  const { productMap } = useEntityMaps();
  const labs = useAppStore((state) => state.labs);
  const loadLabs = useAppStore((state) => state.loadLabs);
  const labMap = useMemo(() => new Map(labs.map((lab) => [lab.id, lab.name])), [labs]);
  const recordMap = useMemo(() => new Map(companyProductRecords.map((rec) => [rec.id, rec])), [companyProductRecords]);

  const [selectedItem, setSelectedItem] = useState<PendingEntry | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [labNotes, setLabNotes] = useState("");
  const [documents, setDocuments] = useState<LabFormDocument[]>([]);
  const [isFilterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    productTypes: [] as string[],
    companyName: undefined as string | undefined,
    customerCode: undefined as string | undefined,
    productName: undefined as string | undefined,
    labId: undefined as number | undefined,
    sentFrom: undefined as string | undefined,
    labEntryCode: undefined as string | undefined
  });

  const isLabUser = activeRole === "lab";
  const allowEdit = isLabUser;
  const buttonLabel = isLabUser ? "Formu Doldur" : "İncele";
  const MAX_DOCUMENT_SIZE = 5 * 1024 * 1024;

  const createDocumentId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const readFileAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result ?? "") as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

  const handleDocumentAdd = async (files: File[]) => {
    if (!files.length) return;
    const oversize = files.find((file) => file.size > MAX_DOCUMENT_SIZE);
    if (oversize) {
      addToast({
        title: "Dosya çok büyük",
        description: `${oversize.name} dosyası 5 MB sınırını aşıyor.`,
        variant: "error"
      });
      return;
    }

    try {
          const newDocuments = await Promise.all(
            files.map(async (file) => ({
              id: createDocumentId(),
              name: file.name,
              size: file.size,
              type: file.type,
              uploadedAt: new Date().toISOString(),
              dataUrl: await readFileAsDataUrl(file),
              file
            }))
          );
      setDocuments((prev) => [...prev, ...newDocuments]);
    } catch {
      addToast({
        title: "Dosya eklenemedi",
        description: "Lütfen dosyayı yeniden seçin ve tekrar deneyin.",
        variant: "error"
      });
    }
  };

  const handleDocumentRemove = (documentId: string) => {
    setDocuments((prev) => prev.filter((doc) => doc.id !== documentId));
  };

  const pendingItems = useMemo<PendingEntry[]>(() => {
    return tripItems.reduce<PendingEntry[]>((accumulator, item) => {
      if (
        !item.labSentAt ||
        item.labStatus === "ACCEPTED" ||
        item.labStatus === "APPROVED" ||
        item.labStatus === "WAITING_CONFIRM"
      ) {
        return accumulator;
      }

      const record = recordMap.get(item.companyProductId);
      if (!record) return accumulator;
      const mappedProduct = record.productId ? productMap.get(record.productId) : undefined;
      const product = mappedProduct ?? {
        id: record.productId ?? item.companyProductId,
        name: record.productName,
        productType: record.productType,
        standardNo: record.standard,
        labReturnDays: record.labReturnDays
      };
      const form = labForms.find((lab) => lab.tripItemId === item.id);

      accumulator.push({
        item,
        companyName: record.companyName,
        companyBtCode: record.btCode,
        productName: product.name,
        productType: record.productType ?? product.productType,
        productStandard: product.standardNo ?? record.standard,
        productCode: record.productCode,
        labId: item.labAssignedLabId,
        labEntryCode: item.labEntryCode,
        labSentAt: item.labSentAt ?? item.sampledAt,
        labReturnDays: record.labReturnDays ?? product.labReturnDays,
        labFormData: form?.data,
        labNotes: form?.labNotes,
        cpcNotes: form?.cpcNotes ?? item.labShipmentDetails?.cpcNote,
        documents: form?.documents ?? [],
        companyProductId: record.id ?? item.companyProductId,
        location: record.location
      });

      return accumulator;
    }, []).sort((a, b) => {
      const aDate = a.labSentAt ? Date.parse(a.labSentAt) : 0;
      const bDate = b.labSentAt ? Date.parse(b.labSentAt) : 0;
      return bDate - aDate;
    });
  }, [tripItems, recordMap, productMap, labForms]);

  const availableProductTypes = useMemo(() => {
    const types = new Set<string>();
    pendingItems.forEach((entry) => {
      if (entry.productType) types.add(entry.productType);
    });
    return Array.from(types);
  }, [pendingItems]);

  const availableCompanies = useMemo(() => {
    const names = new Set<string>();
    pendingItems.forEach((entry) => {
      if (entry.companyName) names.add(entry.companyName);
    });
    return Array.from(names);
  }, [pendingItems]);

  const availableProducts = useMemo(() => {
    const names = new Set<string>();
    pendingItems.forEach((entry) => {
      if (entry.productName) names.add(entry.productName);
    });
    return Array.from(names);
  }, [pendingItems]);

  const filteredItems = useMemo(() => {
    let base = pendingItems;
    if (filters.productTypes.length > 0) {
      base = base.filter((entry) => (entry.productType ? filters.productTypes.includes(entry.productType) : false));
    }
    if (filters.companyName) {
      const q = filters.companyName.toLowerCase();
      base = base.filter((entry) => entry.companyName.toLowerCase().includes(q));
    }
    if (filters.customerCode) {
      const q = filters.customerCode.toLowerCase();
      base = base.filter((entry) => (entry.companyBtCode ?? "-").toLowerCase().includes(q));
    }
    if (filters.productName) {
      const q = filters.productName.toLowerCase();
      base = base.filter((entry) => entry.productName.toLowerCase().includes(q));
    }
    if (filters.labId !== undefined) {
      base = base.filter((entry) => entry.labId === filters.labId);
    }
    if (filters.sentFrom) {
      const fromTimestamp = Date.parse(filters.sentFrom);
      if (!Number.isNaN(fromTimestamp)) {
        base = base.filter((entry) => {
          const sentAt = entry.labSentAt ?? entry.item.sampledAt;
          if (!sentAt) return false;
          return Date.parse(sentAt) >= fromTimestamp;
        });
      }
    }
    if (filters.labEntryCode) {
      const q = filters.labEntryCode.toLowerCase();
      base = base.filter((entry) => (entry.labEntryCode ?? "-").toLowerCase().includes(q));
    }
    return base;
  }, [pendingItems, filters]);

  const handleResetFilters = () => {
    setFilters({
      productTypes: [],
      companyName: undefined,
      customerCode: undefined,
      productName: undefined,
      labId: undefined,
      sentFrom: undefined,
      labEntryCode: undefined
    });
  };

  const activeChips = useMemo(() => {
    const chips: { key: string; label: string; onRemove: () => void }[] = [];
    if (filters.productTypes[0]) {
      const code = filters.productTypes[0];
      chips.push({
        key: `pt-${code}`,
        label: getProductTypeLabel(code as any),
        onRemove: () =>
          setFilters((prev) => ({
            ...prev,
            productTypes: []
          }))
      });
    }
    if (filters.companyName) {
      chips.push({
        key: `company-${filters.companyName}`,
        label: `Firma: ${filters.companyName}`,
        onRemove: () =>
          setFilters((prev) => ({
            ...prev,
            companyName: undefined
          }))
      });
    }
    if (filters.customerCode) {
      chips.push({
        key: `bt-${filters.customerCode}`,
        label: `BT: ${filters.customerCode}`,
        onRemove: () =>
          setFilters((prev) => ({
            ...prev,
            customerCode: undefined
          }))
      });
    }
    if (filters.productName) {
      chips.push({
        key: `product-${filters.productName}`,
        label: `Ürün: ${filters.productName}`,
        onRemove: () =>
          setFilters((prev) => ({
            ...prev,
            productName: undefined
          }))
      });
    }
    if (filters.labId !== undefined) {
      chips.push({
        key: `lab-${filters.labId}`,
        label: `Lab: ${labMap.get(filters.labId) ?? filters.labId}`,
        onRemove: () =>
          setFilters((prev) => ({
            ...prev,
            labId: undefined
          }))
      });
    }
    if (filters.sentFrom) {
      const label = formatDate(`${filters.sentFrom}T00:00:00Z`);
      chips.push({
        key: `from-${filters.sentFrom}`,
        label: `Gönderim: ${label}`,
        onRemove: () =>
          setFilters((prev) => ({
            ...prev,
            sentFrom: undefined
          }))
      });
    }
    if (filters.labEntryCode) {
      chips.push({
        key: `entry-${filters.labEntryCode}`,
        label: `Ürün Kodu: ${filters.labEntryCode}`,
        onRemove: () =>
          setFilters((prev) => ({
            ...prev,
            labEntryCode: undefined
          }))
      });
    }
    return chips;
  }, [filters, labMap]);

  useEffect(() => {
    if (!selectedItem) {
      setFormValues({});
      setLabNotes("");
      setDocuments([]);
      return;
    }

    const fieldConfig = getFieldConfig({
      productType: selectedItem.productType,
      standardNo: selectedItem.productStandard
    });
    const existingData = selectedItem.labFormData ?? {};
    const nextValues: Record<string, string> = {};

    fieldConfig.forEach((field) => {
      const rawValue = existingData[field.key];
      nextValues[field.key] = rawValue !== undefined && rawValue !== null ? String(rawValue) : "";
    });

    setFormValues(nextValues);
    setLabNotes(selectedItem.labNotes ?? "");
    setDocuments(Array.isArray(selectedItem.documents) ? selectedItem.documents.map((doc) => ({ ...doc })) : []);
  }, [selectedItem]);

  const columns: TableColumn<PendingEntry>[] = [
    {
      id: "btCode",
      header: "BT Kod",
      cell: (row) => row.companyBtCode ?? "-"
    },
    {
      id: "product",
      header: isLabUser ? "Ürün" : "Firma / Ürün",
      cell: (row) => (isLabUser ? row.productName : `${row.companyName} / ${row.productName}`)
    },
    {
      id: "labEntry",
      header: "Takip Kodu",
      cell: (row) => row.labEntryCode ?? "-"
    },
    {
      id: "lab",
      header: "Laboratuvar",
      cell: (row) => (row.labId !== undefined ? labMap.get(row.labId) ?? "-" : "-")
    },
    {
      id: "sentAt",
      header: "Gönderim Tarihi",
      cell: (row) => (row.labSentAt ? formatDate(row.labSentAt) : "-")
    },
    {
      id: "expectedReturn",
      header: "Beklenen Dönüş Tarihi",
      cell: (row) => {
        const baseDate = row.labSentAt ?? row.item.sampledAt;
        if (!baseDate) return "-";
        const date = new Date(baseDate);
        const additionalDays = row.labReturnDays ?? (row.productType === "fly_ash" ? 90 : 28);
        date.setDate(date.getDate() + additionalDays);
        return formatDate(date.toISOString());
      }
    },
    {
      id: "status",
      header: "Durum",
      cell: (row) => {
        const status = row.item.labStatus ?? "SUBMITTED";
        const label = labStatusLabels[status] ?? labStatusLabels.SUBMITTED;
        const token = labStatusTokens[status] ?? labStatusTokens.SUBMITTED;
        return <Badge className={token}>{label}</Badge>;
      }
    },
    {
      id: "actions",
      header: "",
      cell: (row) => (
        <Button
          size="sm"
          variant={isLabUser ? "secondary" : "ghost"}
          onClick={() => setSelectedItem(row)}
        >
          {buttonLabel}
        </Button>
      )
    }
  ];

  const fieldConfig = getFieldConfig({
    productType: selectedItem?.productType,
    standardNo: selectedItem?.productStandard
  });

  useEffect(() => {
    loadLabItems("processing");
    loadCompanyProductRecords();
    loadLabs();
  }, [loadLabItems, loadCompanyProductRecords, loadLabs]);

  const canSubmit =
    allowEdit &&
    selectedItem !== null &&
    fieldConfig.every((field) => {
      const raw = formValues[field.key];
      if (raw === undefined) return false;
      if (field.isDate) {
        return Boolean(raw);
      }
      return String(raw).trim().length > 0;
    });

  const handleSubmit = () => {
    if (!allowEdit || !selectedItem || !canSubmit) return;

    upsertLabForm({
      tripItemId: selectedItem.item.id,
      standardNo: selectedItem.productStandard,
      data: { ...formValues },
      status: "WAITING_CONFIRM",
      labNotes: labNotes || undefined,
      cpcNotes: selectedItem.cpcNotes,
      documents: documents.map((doc) => ({ ...doc }))
    });
    addToast({
      title: "Form onaya gönderildi",
      description: isLabUser
        ? selectedItem.productName
        : `${selectedItem.companyName} - ${selectedItem.productName}`,
      variant: "success"
    });
    setSelectedItem(null);
    setDocuments([]);
  };

  const shipmentDetails = selectedItem?.item.labShipmentDetails ?? null;
  const renderValue = (value: unknown) => {
    if (value === null || value === undefined) return "-";
    if (typeof value === "number") {
      return Number.isFinite(value) ? value.toString() : "-";
    }
    if (typeof value === "string") {
      return value.trim() === "" ? "-" : value;
    }
    return String(value);
  };

  const modalDescription = selectedItem
    ? isLabUser
      ? selectedItem.productStandard
        ? `${selectedItem.productName} (${selectedItem.productStandard})`
        : selectedItem.productName
      : `${selectedItem.companyName} / ${selectedItem.productName}${selectedItem.productStandard ? ` (${selectedItem.productStandard})` : ""}`
    : undefined;

  const modalFooter = allowEdit ? (
    <div className="flex justify-end gap-2">
      <Button variant="ghost" onClick={() => setSelectedItem(null)}>
        Vazgeç
      </Button>
      <Button onClick={handleSubmit} disabled={!canSubmit}>
        Gönder
      </Button>
    </div>
  ) : (
    <div className="flex justify-end">
      <Button variant="ghost" onClick={() => setSelectedItem(null)}>
        Kapat
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Laboratuvar Giden Kutusu</h1>
          <p className="text-sm text-slate-500">Gönderilen labratuvar kayıtlarını inceleyin.</p>
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

      {activeChips.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {activeChips.map((chip) => (
            <Chip key={chip.key} onRemove={chip.onRemove}>
              {chip.label}
            </Chip>
          ))}
        </div>
      ) : null}

      <Table
        columns={columns}
        data={filteredItems}
        keyExtractor={(row) => row.item.id}
        emptyState="Bekleyen numune bulunmuyor"
      />

      <Drawer
        open={isFilterOpen}
        onClose={() => setFilterOpen(false)}
        title="Filtreler"
        footer={
          <div className="flex justify-between gap-2">
            <Button variant="ghost" onClick={() => { handleResetFilters(); setFilterOpen(false); }}>
              Sıfırla
            </Button>
            <Button onClick={() => setFilterOpen(false)}>Uygula</Button>
          </div>
        }
      >
        <div className="space-y-6">
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-700">Ürün Tipi</h3>
            <input
              list="processingProductTypes"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Ürün tipi seçin veya arayın"
              value={filters.productTypes[0] ? getProductTypeLabel(filters.productTypes[0] as any) : ""}
              onChange={(event) => {
                const label = event.target.value;
                const matched = availableProductTypes.find(
                  (type) => getProductTypeLabel(type as any) === label
                );
                setFilters((prev) => ({
                  ...prev,
                  productTypes: matched ? [matched] : []
                }));
              }}
            />
            <datalist id="processingProductTypes">
              {availableProductTypes.map((type) => (
                <option key={type} value={getProductTypeLabel(type as any)}>
                  {getProductTypeLabel(type as any)}
                </option>
              ))}
            </datalist>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-700">Firma</h3>
            <input
              list="processingCompanyOptions"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Firma adı"
              value={filters.companyName ?? ""}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  companyName: event.target.value || undefined
                }))
              }
            />
            <datalist id="processingCompanyOptions">
              {availableCompanies.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </datalist>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-700">BT Kodu</h3>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="BT kodu"
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
            <h3 className="text-sm font-semibold text-slate-700">Ürün</h3>
            <input
              list="processingProductOptions"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Ürün adı"
              value={filters.productName ?? ""}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  productName: event.target.value || undefined
                }))
              }
            />
            <datalist id="processingProductOptions">
              {availableProducts.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </datalist>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-700">Laboratuvar</h3>
            <select
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={filters.labId ?? ""}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  labId: event.target.value ? Number(event.target.value) : undefined
                }))
              }
            >
              <option value="">Tümü</option>
              {labs.map((lab) => (
                <option key={lab.id} value={lab.id}>
                  {lab.name}
                </option>
              ))}
            </select>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-700">Ürün Kodu</h3>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Takip numarası"
              value={filters.labEntryCode ?? ""}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  labEntryCode: event.target.value || undefined
                }))
              }
            />
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-700">Gönderim Tarihi (en erken)</h3>
            <input
              type="date"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={filters.sentFrom ?? ""}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  sentFrom: event.target.value || undefined
                }))
              }
            />
          </section>
        </div>
      </Drawer>

      <Modal
        open={Boolean(selectedItem)}
        onClose={() => setSelectedItem(null)}
        title="Numune Formu"
        description={modalDescription}
        size="xl"
        className="max-h-[90vh]"
        footer={selectedItem ? modalFooter : undefined}
      >
        {selectedItem ? (
          <div className="max-h-[65vh] space-y-5 overflow-y-auto pr-1 text-sm text-slate-700">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-slate-500">Lab Giriş No</span>
                <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                  {selectedItem.labEntryCode ?? "-"}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-slate-500">Laboratuvar</span>
                <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                  {selectedItem.labId !== undefined ? labMap.get(selectedItem.labId) ?? "-" : "-"}
                </span>
              </div>
            </div>

            {shipmentDetails ? (
              <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Saha Gönderim Bilgileri
                </h3>
                <div className="grid gap-3 md:grid-cols-2">
                  {SHIPMENT_FIELDS.map((field) => {
                    const rawValue = shipmentDetails[field.key];
                    const value =
                      field.isDate && typeof rawValue === "string" && rawValue
                        ? formatDate(rawValue)
                        : renderValue(rawValue);
                    return (
                      <div key={field.key} className="flex flex-col gap-1">
                        <span className="text-xs font-semibold text-slate-500">{field.label}</span>
                        <span className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                          {value}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <LabFormDetails
              fieldConfig={fieldConfig}
              fieldValues={formValues}
              onFieldChange={
                allowEdit
                  ? (key, value) =>
                      setFormValues((prev) => ({
                        ...prev,
                      [key]: value
                    }))
                  : undefined
              }
              fieldsDisabled={!allowEdit}
              documents={documents}
              onDocumentAdd={allowEdit ? handleDocumentAdd : undefined}
              onDocumentRemove={allowEdit ? handleDocumentRemove : undefined}
              documentActionsDisabled={!allowEdit}
              labNote={labNotes}
              onLabNoteChange={allowEdit ? (value) => setLabNotes(value) : undefined}
              labNoteDisabled={!allowEdit}
              cpcNote={selectedItem.cpcNotes ?? ""}
              cpcNotePlaceholder="CPC notu bulunmuyor"
              cpcNoteDisabled
            />
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

export default LabProcessingView;
