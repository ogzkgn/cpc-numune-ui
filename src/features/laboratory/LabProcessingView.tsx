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
import type { TableColumn } from "../../components/ui/Table";
import type { TripItem } from "../../types";

type PendingEntry = {
  item: TripItem;
  companyName: string;
  productName: string;
  productStandard: string | undefined;
  productCode: string | undefined;
  labId: number | undefined;
  labEntryCode: string | undefined;
  labSentAt: string | undefined;
  labFormData: Record<string, unknown> | undefined;
  companyProductId: number;
};

const LabProcessingView = () => {
  const tripItems = useAppStore((state) => state.tripItems);
  const labForms = useAppStore((state) => state.labForms);
  const activeRole = useAppStore((state) => state.activeRole);
  const addToast = useAppStore((state) => state.addToast);
  const upsertLabForm = useAppStore((state) => state.upsertLabForm);
  const updateTripItemLabStatus = useAppStore((state) => state.updateTripItemLabStatus);
  const { companyMap, productMap, companyProductMap } = useEntityMaps();
  const labs = useAppStore((state) => state.labs);
  const labMap = useMemo(() => new Map(labs.map((lab) => [lab.id, lab.name])), [labs]);

  const [selectedItem, setSelectedItem] = useState<PendingEntry | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");

  const isLabUser = activeRole === "lab";
  const allowEdit = isLabUser;
  const buttonLabel = isLabUser ? "Formu Doldur" : "İncele";

  const pendingItems = useMemo<PendingEntry[]>(() => {
    return tripItems
      .filter(
        (item) =>
          item.labSentAt &&
          item.labStatus !== "ACCEPTED" &&
          item.labStatus !== "APPROVED"
      )
      .map((item) => {
        const companyProduct = companyProductMap.get(item.companyProductId);
        if (!companyProduct) return null;
        const company = companyMap.get(companyProduct.companyId);
        const product = productMap.get(companyProduct.productId);
        if (!company || !product) return null;
        const form = labForms.find((lab) => lab.tripItemId === item.id);

        return {
          item,
          companyName: company.name,
          productName: product.name,
          productStandard: product.standardNo ?? undefined,
          productCode: companyProduct.productCode,
          labId: item.labAssignedLabId,
          labEntryCode: item.labEntryCode,
          labSentAt: item.labSentAt ?? item.sampledAt,
          labFormData: form?.data,
          companyProductId: companyProduct.id
        };
      })
      .filter((entry): entry is PendingEntry => entry !== null)
      .sort((a, b) => {
        const aDate = a.labSentAt ? Date.parse(a.labSentAt) : 0;
        const bDate = b.labSentAt ? Date.parse(b.labSentAt) : 0;
        return bDate - aDate;
      });
  }, [tripItems, companyMap, productMap, companyProductMap, labForms]);

  useEffect(() => {
    if (!selectedItem) {
      setFormValues({});
      setNotes("");
      return;
    }

    const fieldConfig = getFieldConfig(selectedItem.productStandard);
    const existingData = selectedItem.labFormData ?? {};
    const nextValues: Record<string, string> = {};

    fieldConfig.forEach((field) => {
      const rawValue = existingData[field.key];
      nextValues[field.key] =
        rawValue !== undefined && rawValue !== null ? String(rawValue) : "";
    });

    setFormValues(nextValues);
    setNotes(
      typeof existingData.notes === "string" ? existingData.notes : ""
    );
  }, [selectedItem]);

  const columns: TableColumn<PendingEntry>[] = [
    {
      id: "product",
      header: isLabUser ? "Ürün" : "Firma / Ürün",
      cell: (row) => (isLabUser ? row.productName : `${row.companyName} / ${row.productName}`)
    },
    {
      id: "productCode",
      header: "Ürün Kodu",
      cell: (row) => row.productCode ?? "-"
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

    const data: Record<string, unknown> = {
      ...formValues,
      notes
    };

    upsertLabForm({
      tripItemId: selectedItem.item.id,
      standardNo: selectedItem.productStandard,
      data,
      status: "APPROVED"
    });
    updateTripItemLabStatus(selectedItem.item.id, "ACCEPTED");
    addToast({
      title: "Numune kabul edildi",
      description: isLabUser
        ? selectedItem.productName
        : `${selectedItem.companyName} - ${selectedItem.productName}`,
      variant: "success"
    });
    setSelectedItem(null);
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
      : `${selectedItem.companyName} / ${selectedItem.productName}${
          selectedItem.productStandard ? ` (${selectedItem.productStandard})` : ""
        }`
    : undefined;
  const drawerFooter = allowEdit ? (
    <div className="flex justify-end gap-2">
      <Button variant="ghost" onClick={() => setSelectedItem(null)}>
        VazgeÃ§
      </Button>
      <Button onClick={handleSubmit} disabled={!canSubmit}>
        GÃ¶nder
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
        <p className="text-sm text-slate-500">
          Gönderilen numuneleri inceleyin, girin ve kabul edin.
        </p>
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
                  Saha GÃ¶nderim Bilgileri
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

            <div className="space-y-4">
              {fieldConfig.map((field) => (
                <label key={field.key} className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                  {field.label}
                  <input
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    type={field.isDate ? "date" : "text"}
                    value={formValues[field.key] ?? ""}
                    disabled={!allowEdit}
                    onChange={(event) =>
                      setFormValues((prev) => ({
                        ...prev,
                        [field.key]: event.target.value
                      }))
                    }
                  />
                </label>
              ))}
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                Açıklama
                <textarea
                  className="min-h-[96px] rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={notes}
                  disabled={!allowEdit}
                  onChange={(event) => setNotes(event.target.value)}
                />
              </label>
            </div>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
};

export default LabProcessingView;
