import { useEffect, useMemo, useState } from "react";

import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Drawer from "../../components/ui/Drawer";
import Table from "../../components/ui/Table";
import { useAppStore } from "../../state/useAppStore";
import { useEntityMaps } from "../../hooks/useEntityMaps";
import { formatDate } from "../../utils/date";
import { labStatusLabels, labStatusTokens } from "../../utils/labels";
import { FALLBACK_DATA, SHIPMENT_FIELDS, getFieldConfig } from "./labConstants";
import LabFormDetails from "./components/LabFormDetails";
import type { TableColumn } from "../../components/ui/Table";
import type { LabFormDocument } from "../../types";

const LabInboxView = () => {
  const tripItems = useAppStore((state) => state.tripItems);
  const trips = useAppStore((state) => state.trips);
  const labForms = useAppStore((state) => state.labForms);
  const labs = useAppStore((state) => state.labs);
  const activeRole = useAppStore((state) => state.activeRole);
  const upsertLabForm = useAppStore((state) => state.upsertLabForm);
  const updateTripItemLabStatus = useAppStore((state) => state.updateTripItemLabStatus);
  const addToast = useAppStore((state) => state.addToast);
  const { companyProductMap, companyMap, productMap } = useEntityMaps();
  const labMap = useMemo(() => new Map(labs.map((lab) => [lab.id, lab.name])), [labs]);

  const [selectedItem, setSelectedItem] = useState<(typeof tripItems)[number] | null>(null);
  const [isEditingRevision, setIsEditingRevision] = useState(false);
  const [revisionNote, setRevisionNote] = useState("");
  const isLabUser = activeRole === "lab";
  const isAdminUser = activeRole === "admin";

  const inboxItems = useMemo(() => {
    return tripItems
      .map((item) => {
        const trip = trips.find((t) => t.id === item.tripId);
        const companyProduct = companyProductMap.get(item.companyProductId);
        const company = companyProduct ? companyMap.get(companyProduct.companyId) : undefined;
        const product = companyProduct ? productMap.get(companyProduct.productId) : undefined;
        const form = labForms.find((lab) => lab.tripItemId === item.id);

        if (!company || !product || !companyProduct) return null;
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
          companyProduct,
          company,
          product,
          form
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
  }, [tripItems, trips, companyProductMap, companyMap, productMap, labForms]);

  const columns: TableColumn<(typeof inboxItems)[number]>[] = [
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

  const currentProduct = selectedItem
    ? productMap.get(companyProductMap.get(selectedItem.companyProductId)?.productId ?? 0)
    : undefined;

  const selectedForm = useMemo(
    () => (selectedItem ? labForms.find((lab) => lab.tripItemId === selectedItem.id) : undefined),
    [selectedItem, labForms]
  );

  useEffect(() => {
    setIsEditingRevision(false);
    setRevisionNote(selectedForm?.cpcNotes ?? "");
  }, [selectedForm]);

  const displayFields = getFieldConfig(currentProduct?.standardNo);

  const shipmentDetails = selectedItem?.labShipmentDetails ?? null;
  const isAccepted = selectedItem?.labStatus === "ACCEPTED" || selectedItem?.labStatus === "APPROVED";
  const isWaitingConfirm = selectedItem?.labStatus === "WAITING_CONFIRM";
  const showFormDetails = isAccepted || isWaitingConfirm;

  const formData = (selectedForm?.data ?? FALLBACK_DATA) as Record<string, unknown>;
  const labNote = selectedForm?.labNotes ?? null;
  const cpcNote = selectedForm?.cpcNotes ?? null;
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
  const documents = (selectedForm?.documents ?? []).map((doc) => ({ ...doc })) as LabFormDocument[];

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

  const handleApprove = () => {
    if (!selectedItem || !selectedForm) return;
    const normalizedData = { ...(selectedForm.data ?? {}) } as Record<string, unknown>;

    upsertLabForm({
      tripItemId: selectedItem.id,
      standardNo: selectedForm.standardNo,
      data: normalizedData,
      status: "APPROVED",
      labNotes: selectedForm.labNotes,
      cpcNotes: selectedForm.cpcNotes,
      documents: (selectedForm.documents ?? []).map((doc) => ({ ...doc }))
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

    upsertLabForm({
      tripItemId: selectedItem.id,
      standardNo: selectedForm.standardNo,
      data: normalizedData,
      status: "DRAFT",
      labNotes: selectedForm.labNotes,
      cpcNotes: note,
      documents: (selectedForm.documents ?? []).map((doc) => ({ ...doc }))
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

  const drawerFooter = !selectedItem
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
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Laboratuvar Gelen Kutusu</h1>
        <p className="text-sm text-slate-500">Sahadan gelen numuneleri izleyin ve sonuçlarını görüntüleyin.</p>
      </div>

      <Table
        columns={columns}
        data={inboxItems}
        keyExtractor={(row) => row.item.id}
        emptyState="Laboratuvarda bekleyen numune yok"
      />

      <Drawer
        open={Boolean(selectedItem)}
        onClose={() => setSelectedItem(null)}
        title="Laboratuvar Formu"
        description={
          currentProduct
            ? `${currentProduct.name} / ${currentProduct.standardNo ?? "Standart belirtilmedi"}`
            : undefined
        }
        width="lg"
        footer={drawerFooter}
      >
        {selectedItem ? (
          <div className="space-y-4 text-sm text-slate-700">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-slate-500">Takip No</span>
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
      </Drawer>
    </div>
  );
};

export default LabInboxView;
