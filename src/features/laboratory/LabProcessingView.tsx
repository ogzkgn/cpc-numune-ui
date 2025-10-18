import { useEffect, useMemo, useState } from "react";

import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Drawer from "../../components/ui/Drawer";
import Table from "../../components/ui/Table";
import { useAppStore } from "../../state/useAppStore";
import { useEntityMaps } from "../../hooks/useEntityMaps";
import { formatDate } from "../../utils/date";
import { labStatusLabels, labStatusTokens } from "../../utils/labels";
import { SHIPMENT_FIELDS, getFieldConfig } from "./labConstants";
import LabFormDetails from "./components/LabFormDetails";
import type { TableColumn } from "../../components/ui/Table";
import type { LabFormDocument, TripItem } from "../../types";

type PendingEntry = {
  item: TripItem;
  companyName: string;
  companyBtCode?: string;
  productName: string;
  productStandard: string | undefined;
  productCode: string | undefined;
  labId: number | undefined;
  labEntryCode: string | undefined;
  labSentAt: string | undefined;
  labFormData: Record<string, unknown> | undefined;
  labNotes: string | undefined;
  cpcNotes: string | undefined;
  documents: LabFormDocument[] | undefined;
  companyProductId: number;
};

const LabProcessingView = () => {
  const tripItems = useAppStore((state) => state.tripItems);
  const labForms = useAppStore((state) => state.labForms);
  const activeRole = useAppStore((state) => state.activeRole);
  const addToast = useAppStore((state) => state.addToast);
  const upsertLabForm = useAppStore((state) => state.upsertLabForm);
  const { companyMap, productMap, companyProductMap } = useEntityMaps();
  const labs = useAppStore((state) => state.labs);
  const labMap = useMemo(() => new Map(labs.map((lab) => [lab.id, lab.name])), [labs]);

  const [selectedItem, setSelectedItem] = useState<PendingEntry | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [labNotes, setLabNotes] = useState("");
  const [documents, setDocuments] = useState<LabFormDocument[]>([]);

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
          dataUrl: await readFileAsDataUrl(file)
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

      const companyProduct = companyProductMap.get(item.companyProductId);
      if (!companyProduct) return accumulator;
      const company = companyMap.get(companyProduct.companyId);
      const product = productMap.get(companyProduct.productId);
      if (!company || !product) return accumulator;
      const form = labForms.find((lab) => lab.tripItemId === item.id);

      accumulator.push({
        item,
        companyName: company.name,
        companyBtCode: company.customerCode,
        productName: product.name,
        productStandard: product.standardNo ?? undefined,
        productCode: companyProduct.productCode,
        labId: item.labAssignedLabId,
        labEntryCode: item.labEntryCode,
        labSentAt: item.labSentAt ?? item.sampledAt,
        labFormData: form?.data,
        labNotes: form?.labNotes,
        cpcNotes: form?.cpcNotes,
        documents: form?.documents ?? [],
        companyProductId: companyProduct.id
      });

      return accumulator;
    }, []).sort((a, b) => {
      const aDate = a.labSentAt ? Date.parse(a.labSentAt) : 0;
      const bDate = b.labSentAt ? Date.parse(b.labSentAt) : 0;
      return bDate - aDate;
    });
  }, [tripItems, companyMap, productMap, companyProductMap, labForms]);

  useEffect(() => {
    if (!selectedItem) {
      setFormValues({});
      setLabNotes("");
      setDocuments([]);
      return;
    }

    const fieldConfig = getFieldConfig(selectedItem.productStandard);
    const existingData = selectedItem.labFormData ?? {};
    const nextValues: Record<string, string> = {};

    fieldConfig.forEach((field) => {
      const rawValue = existingData[field.key];
      nextValues[field.key] = rawValue !== undefined && rawValue !== null ? String(rawValue) : "";
    });

    setFormValues(nextValues);
    setLabNotes(selectedItem.labNotes ?? "");
    setDocuments((selectedItem.documents ?? []).map((doc) => ({ ...doc })));
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
        date.setDate(date.getDate() + 30);
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

  const fieldConfig = getFieldConfig(selectedItem?.productStandard);

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

  const drawerDescription = selectedItem
    ? isLabUser
      ? selectedItem.productStandard
        ? `${selectedItem.productName} (${selectedItem.productStandard})`
        : selectedItem.productName
      : `${selectedItem.companyName} / ${selectedItem.productName}${selectedItem.productStandard ? ` (${selectedItem.productStandard})` : ""}`
    : undefined;

  const drawerFooter = allowEdit ? (
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
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Laboratuvar İş Akışı</h1>
        <p className="text-sm text-slate-500">Gönderilen numuneleri inceleyin, girin ve kabul edin.</p>
      </div>

      <Table
        columns={columns}
        data={pendingItems}
        keyExtractor={(row) => row.item.id}
        emptyState="Bekleyen numune bulunmuyor"
      />

      <Drawer
        open={Boolean(selectedItem)}
        onClose={() => setSelectedItem(null)}
        title="Numune Formu"
        description={drawerDescription}
        width="lg"
        footer={selectedItem ? drawerFooter : undefined}
      >
        {selectedItem ? (
          <div className="space-y-5 text-sm text-slate-700">
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
      </Drawer>
    </div>
  );
};

export default LabProcessingView;

