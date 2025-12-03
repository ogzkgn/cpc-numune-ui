import Modal from "../../components/ui/Modal";
import Drawer from "../../components/ui/Drawer";
import Chip from "../../components/ui/Chip";
import { Filter, RotateCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Table from "../../components/ui/Table";
import { useAppStore } from "../../state/useAppStore";
import { useEntityMaps } from "../../hooks/useEntityMaps";
import { formatDate } from "../../utils/date";
import { labStatusLabels, labStatusTokens, getProductTypeLabel } from "../../utils/labels";
import { FALLBACK_DATA, SHIPMENT_FIELDS, getFieldConfig } from "./labConstants";
import LabFormDetails from "./components/LabFormDetails";
import type { TableColumn } from "../../components/ui/Table";
import type { LabFormDocument } from "../../types";

const LabInboxView = () => {
  const tripItems = useAppStore((state) => state.tripItems);
  const trips = useAppStore((state) => state.trips);
  const labForms = useAppStore((state) => state.labForms);
  const labs = useAppStore((state) => state.labs);
  const loadLabs = useAppStore((state) => state.loadLabs);
  const activeRole = useAppStore((state) => state.activeRole);
  const upsertLabForm = useAppStore((state) => state.upsertLabForm);
  const updateTripItemLabStatus = useAppStore((state) => state.updateTripItemLabStatus);
  const addToast = useAppStore((state) => state.addToast);
  const loadLabItems = useAppStore((state) => state.loadLabItems);
  const loadCompanyProductRecords = useAppStore((state) => state.loadCompanyProductRecords);
  const companyProductRecords = useAppStore((state) => state.companyProductRecords);
  const { productMap } = useEntityMaps();
  const labMap = useMemo(() => new Map(labs.map((lab) => [lab.id, lab.name])), [labs]);

  const [selectedItem, setSelectedItem] = useState<(typeof tripItems)[number] | null>(null);
  const [isEditingRevision, setIsEditingRevision] = useState(false);
  const [revisionNote, setRevisionNote] = useState("");
  const isLabUser = activeRole === "lab";
  const isAdminUser = activeRole === "admin";

  const recordMap = useMemo(() => new Map(companyProductRecords.map((rec) => [rec.id, rec])), [companyProductRecords]);

  const [isFilterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    productTypes: [] as string[],
    companyName: undefined as string | undefined,
    customerCode: undefined as string | undefined,
    productName: undefined as string | undefined,
    labId: undefined as number | undefined,
    labEntryCode: undefined as string | undefined,
    sentFrom: undefined as string | undefined
  });

  const inboxItems = useMemo(() => {
    return tripItems
      .map((item) => {
        const trip = trips.find((t) => t.id === item.tripId);
        const record = recordMap.get(item.companyProductId);
        const product =
          record?.productId && productMap.get(record.productId)
            ? productMap.get(record.productId)
            : record
              ? {
                  id: record.productId ?? item.companyProductId,
                  name: record.productName,
                  productType: record.productType,
                  standardNo: record.standard
                }
              : undefined;
        const form = labForms.find((lab) => lab.tripItemId === item.id);

        if (!record || !product) return null;
        if (
          item.labStatus !== "ACCEPTED" &&
          item.labStatus !== "APPROVED" &&
          item.labStatus !== "WAITING_CONFIRM"
        ) {
          return null;
        }

        return {
          item,
          trip,
          company: { name: record.companyName, customerCode: record.btCode },
          product,
          record,
          productType: record.productType ?? product?.productType,
          form
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
  }, [tripItems, trips, recordMap, productMap, labForms]);

  const availableProductTypes = useMemo(() => {
    const types = new Set<string>();
    inboxItems.forEach((entry) => {
      if (entry.record?.productType) types.add(entry.record.productType);
      if (entry.product?.productType) types.add(entry.product.productType);
    });
    return Array.from(types);
  }, [inboxItems]);

  const availableCompanies = useMemo(() => {
    const names = new Set<string>();
    inboxItems.forEach((entry) => {
      if (entry.company?.name) names.add(entry.company.name);
    });
    return Array.from(names);
  }, [inboxItems]);

  const availableProducts = useMemo(() => {
    const names = new Set<string>();
    inboxItems.forEach((entry) => {
      if (entry.product?.name) names.add(entry.product.name);
    });
    return Array.from(names);
  }, [inboxItems]);

  const filteredItems = useMemo(() => {
    let base = inboxItems;
    if (filters.productTypes.length > 0) {
      base = base.filter((entry) => {
        const pt = entry.record?.productType ?? entry.product?.productType;
        return pt ? filters.productTypes.includes(pt) : false;
      });
    }
    if (filters.companyName) {
      const q = filters.companyName.toLowerCase();
      base = base.filter((entry) => entry.company?.name.toLowerCase().includes(q));
    }
    if (filters.customerCode) {
      const q = filters.customerCode.toLowerCase();
      base = base.filter((entry) => (entry.company?.customerCode ?? "-").toLowerCase().includes(q));
    }
    if (filters.productName) {
      const q = filters.productName.toLowerCase();
      base = base.filter((entry) => entry.product?.name.toLowerCase().includes(q));
    }
    if (filters.labId !== undefined) {
      base = base.filter((entry) => entry.item.labAssignedLabId === filters.labId);
    }
    if (filters.labEntryCode) {
      const q = filters.labEntryCode.toLowerCase();
      base = base.filter((entry) => (entry.item.labEntryCode ?? "-").toLowerCase().includes(q));
    }
    if (filters.sentFrom) {
      const fromTimestamp = Date.parse(filters.sentFrom);
      if (!Number.isNaN(fromTimestamp)) {
        base = base.filter((entry) => {
          const sentAt = entry.item.labSentAt ?? entry.item.sampledAt;
          if (!sentAt) return false;
          return Date.parse(sentAt) >= fromTimestamp;
        });
      }
    }
    return base;
  }, [inboxItems, filters]);

  const handleResetFilters = () => {
    setFilters({
      productTypes: [],
      companyName: undefined,
      customerCode: undefined,
      productName: undefined,
      labId: undefined,
      labEntryCode: undefined,
      sentFrom: undefined
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
    return chips;
  }, [filters, labMap]);

  const columns: TableColumn<(typeof inboxItems)[number]>[] = [
    {
      id: "btCode",
      header: "BT Kod",
      cell: (row) => row.company?.customerCode ?? "-"
    },
    {
      id: "company",
      header: isLabUser ? "Ürün" : "Firma / Ürün",
      cell: (row) => (isLabUser ? row.product.name : `${row.company.name} / ${row.product.name}`)
    },
    {
      id: "labEntry",
      header: "Takip Kodu",
      cell: (row) => row.item.labEntryCode ?? "-"
    },
    {
      id: "standard",
      header: "Standart",
      cell: (row) => row.product.standardNo ?? "-"
    },
    {
      id: "lab",
      header: "Laboratuvar",
      cell: (row) =>
        row.item.labAssignedLabId !== undefined ? labMap.get(row.item.labAssignedLabId) ?? "-" : "-"
    },
    {
      id: "labSentAt",
      header: "Gönderim Tarihi",
      cell: (row) => {
        const sentAt = row.item.labSentAt ?? row.item.sampledAt;
        return sentAt ? formatDate(sentAt) : "-";
      }
    },
    {
      id: "status",
      header: "Durum",
      cell: (row) => {
        const status = (row.item.labStatus ?? "PENDING") as keyof typeof labStatusLabels;
        const label = labStatusLabels[status];
        const token = labStatusTokens[status];
        return <Badge className={token}>{label}</Badge>;
      }
    },
    {
      id: "actions",
      header: "İşlemler",
      cell: (row) => (
        <Button size="sm" variant="secondary" onClick={() => openForm(row.item)}>
          Formu Görüntüle
        </Button>
      )
    }
  ];

  const openForm = (item: (typeof tripItems)[number]) => {
    setSelectedItem(item);
  };

  const currentProduct = useMemo(() => {
    if (!selectedItem) return undefined;
    const record = recordMap.get(selectedItem.companyProductId);
    if (record?.productId) {
      const product = productMap.get(record.productId);
      if (product) return product;
    }
    return record
      ? { id: record.productId ?? selectedItem.companyProductId, name: record.productName, productType: record.productType, standardNo: record.standard }
      : undefined;
  }, [selectedItem, recordMap, productMap]);

  const selectedForm = useMemo(
    () => (selectedItem ? labForms.find((lab) => lab.tripItemId === selectedItem.id) : undefined),
    [selectedItem, labForms]
  );

  useEffect(() => {
    loadLabItems("inbox");
    loadCompanyProductRecords();
    loadLabs();
  }, [loadLabItems, loadCompanyProductRecords, loadLabs]);

  useEffect(() => {
    setIsEditingRevision(false);
    setRevisionNote(selectedForm?.cpcNotes ?? "");
  }, [selectedForm]);

  const displayFields = getFieldConfig({
    productType: currentProduct?.productType,
    standardNo: currentProduct?.standardNo
  });

  const shipmentDetails = selectedItem?.labShipmentDetails ?? null;
  const isAccepted = selectedItem?.labStatus === "ACCEPTED" || selectedItem?.labStatus === "APPROVED";
  const isWaitingConfirm = selectedItem?.labStatus === "WAITING_CONFIRM";
  const showFormDetails = isAccepted || isWaitingConfirm;

  const formData = (selectedForm?.data ?? FALLBACK_DATA) as Record<string, unknown>;
  const labNote = selectedForm?.labNotes ?? null;
  const cpcNote = selectedForm?.cpcNotes ?? shipmentDetails?.cpcNote ?? null;
  const displayedCpcNote = isEditingRevision ? revisionNote : cpcNote;

  const toInputValue = (value: unknown) => {
    if (value === null || value === undefined) return "";
    if (typeof value === "number") {
      return Number.isFinite(value) ? value.toString() : "";
    }
    if (typeof value === "string") {
      return value;
    }
    return String(value);
  };

  const fieldValues = displayFields.reduce<Record<string, string>>((accumulator, field) => {
    accumulator[field.key] = toInputValue(formData[field.key]);
    return accumulator;
  }, {});
  const labNoteValue = toInputValue(labNote);
  const cpcNoteValue = toInputValue(displayedCpcNote);
  const isRevisionEditable = isWaitingConfirm && isAdminUser && isEditingRevision;
  const documents = Array.isArray(selectedForm?.documents)
    ? (selectedForm?.documents ?? []).map((doc) => ({ ...doc })) as LabFormDocument[]
    : [];

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

  const normalizeDocuments = (docs: unknown) =>
    Array.isArray(docs) ? (docs as LabFormDocument[]).map((doc) => ({ ...doc })) : [];

  const handleApprove = () => {
    if (!selectedItem || !selectedForm) return;
    const normalizedData = { ...(selectedForm.data ?? {}) } as Record<string, unknown>;
    const normalizedDocs = normalizeDocuments(selectedForm.documents);

    upsertLabForm({
      tripItemId: selectedItem.id,
      standardNo: selectedForm.standardNo,
      data: normalizedData,
      status: "APPROVED",
      labNotes: selectedForm.labNotes,
      cpcNotes: selectedForm.cpcNotes,
      documents: normalizedDocs
    });
    updateTripItemLabStatus(selectedItem.id, "ACCEPTED");
    addToast({
      title: "Form onaylandı",
      description: selectedItem.labEntryCode ?? undefined,
      variant: "success"
    });
    setIsEditingRevision(false);
    setSelectedItem(null);
  };

  const handleRequestRevision = (note: string) => {
    if (!selectedItem || !selectedForm) return;
    const normalizedData = { ...(selectedForm.data ?? {}) } as Record<string, unknown>;
    const normalizedDocs = normalizeDocuments(selectedForm.documents);

    upsertLabForm({
      tripItemId: selectedItem.id,
      standardNo: selectedForm.standardNo,
      data: normalizedData,
      status: "DRAFT",
      labNotes: selectedForm.labNotes,
      cpcNotes: note,
      documents: normalizedDocs
    });
    updateTripItemLabStatus(selectedItem.id, "PENDING");
    addToast({
      title: "Revize talebi gönderildi",
      description: selectedItem.labEntryCode ?? undefined,
      variant: "info"
    });
    setIsEditingRevision(false);
    setSelectedItem(null);
  };

  const handleRevisionAction = () => {
    if (!selectedItem || !selectedForm) return;
    if (!isEditingRevision) {
      setIsEditingRevision(true);
      setRevisionNote(selectedForm.cpcNotes ?? "");
      return;
    }
    const trimmed = revisionNote.trim();
    if (!trimmed) {
      addToast({
        title: "Revize notu gerekli",
        description: "Lütfen laboratuvara iletilecek açıklamayı girin.",
        variant: "error"
      });
      return;
    }
    handleRequestRevision(trimmed);
  };

  const modalFooter = !selectedItem
    ? undefined
    : selectedItem.labStatus === "WAITING_CONFIRM" && isAdminUser
      ? (
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setSelectedItem(null)}>
            Kapat
          </Button>
          <Button variant="secondary" onClick={handleRevisionAction}>
            {isEditingRevision ? "Revizeyi gönder" : "Revize iste"}
          </Button>
          <Button onClick={handleApprove}>Formu onayla</Button>
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
          <h1 className="text-2xl font-semibold text-slate-900">Laboratuvar Gelen Kutusu</h1>
          <p className="text-sm text-slate-500">Labratuvardan gelen raporları görüntüleyin, onaylayın, revize edin.</p>
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
        emptyState="Laboratuvarda bekleyen numune yok"
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
              list="inboxProductTypes"
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
            <datalist id="inboxProductTypes">
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
              list="inboxCompanyOptions"
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
            <datalist id="inboxCompanyOptions">
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
              list="inboxProductOptions"
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
            <datalist id="inboxProductOptions">
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
              placeholder="Ürün Kodu"
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
        title="Laboratuvar Formu"
        description={
          currentProduct
            ? `${currentProduct.name} / ${currentProduct.standardNo ?? "Standart belirtilmedi"}`
            : undefined
        }
        size="xl" className="max-h-[90vh]"
        footer={modalFooter}
      >
        {selectedItem ? (
          <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1 text-sm text-slate-700">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-slate-500">Ürün Kodu</span>
                <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                  {selectedItem.labEntryCode ?? "-"}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-slate-500">Laboratuvar</span>
                <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                  {selectedItem.labAssignedLabId !== undefined
                    ? labMap.get(selectedItem.labAssignedLabId) ?? "-"
                    : "-"}
                </span>
              </div>
            </div>

            {showFormDetails ? (
              selectedForm ? (
                <LabFormDetails
                  className="text-sm text-slate-700"
                  fieldConfig={displayFields}
                  fieldValues={fieldValues}
                  documents={documents}
                  documentActionsDisabled
                  fieldsDisabled
                  labNote={labNoteValue}
                  labNoteDisabled
                  labNotePlaceholder="-"
                  cpcNote={isRevisionEditable ? revisionNote : cpcNoteValue}
                  cpcNotePlaceholder="CPC notu bulunmuyor"
                  cpcNoteDisabled={!isRevisionEditable}
                  onCpcNoteChange={
                    isRevisionEditable ? (value) => setRevisionNote(value) : undefined
                  }
                />
              ) : (
                <p className="text-sm text-slate-500">Form verisi bulunamadı.</p>
              )
            ) : shipmentDetails ? (
              <div className="space-y-4 text-sm text-slate-700">
                {SHIPMENT_FIELDS.map((field) => {
                  const rawValue = shipmentDetails[field.key];
                  const value =
                    field.isDate && typeof rawValue === "string" && rawValue
                      ? formatDate(rawValue)
                      : renderValue(rawValue);
                  return (
                    <div key={field.key} className="flex flex-col gap-1">
                      <span className="text-xs font-semibold text-slate-500">{field.label}</span>
                      <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">{value}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-500">Gönderim bilgisi bulunamadı.</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-500">Form verisi bulunamadı.</p>
        )}
      </Modal>
    </div>
  );
};

export default LabInboxView;
