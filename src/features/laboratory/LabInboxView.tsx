import { useMemo, useState } from "react";

import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Drawer from "../../components/ui/Drawer";
import Table from "../../components/ui/Table";
import { useAppStore } from "../../state/useAppStore";
import { useEntityMaps } from "../../hooks/useEntityMaps";
import { formatDate } from "../../utils/date";
import { FALLBACK_DATA, SHIPMENT_FIELDS, getFieldConfig } from "./labConstants";
import type { TableColumn } from "../../components/ui/Table";

const LabInboxView = () => {
  const tripItems = useAppStore((state) => state.tripItems);
  const trips = useAppStore((state) => state.trips);
  const labForms = useAppStore((state) => state.labForms);
  const labs = useAppStore((state) => state.labs);
  const activeRole = useAppStore((state) => state.activeRole);
  const { companyProductMap, companyMap, productMap } = useEntityMaps();
  const labMap = useMemo(() => new Map(labs.map((lab) => [lab.id, lab.name])), [labs]);

  const [selectedItem, setSelectedItem] = useState<(typeof tripItems)[number] | null>(null);
  const isLabUser = activeRole === "lab";

  const inboxItems = useMemo(() => {
    return tripItems
      .map((item) => {
        const trip = trips.find((t) => t.id === item.tripId);
        const companyProduct = companyProductMap.get(item.companyProductId);
        const company = companyProduct ? companyMap.get(companyProduct.companyId) : undefined;
        const product = companyProduct ? productMap.get(companyProduct.productId) : undefined;
        const form = labForms.find((lab) => lab.tripItemId === item.id);

        if (!company || !product || !companyProduct) return null;
        if (item.labStatus !== "ACCEPTED" && item.labStatus !== "APPROVED") return null;

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
        const isReceived = row.item.labStatus === "ACCEPTED" || row.item.labStatus === "APPROVED";
        const label = isReceived ? "Alındı" : "Bekleniyor";
        const token = isReceived ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-700";
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

  const formData = useMemo(() => {
    if (
      !selectedItem ||
      (selectedItem.labStatus !== "ACCEPTED" && selectedItem.labStatus !== "APPROVED")
    ) {
      return null;
    }
    const form = labForms.find((lab) => lab.tripItemId === selectedItem.id);
    if (form) {
      return form.data;
    }
    return FALLBACK_DATA;
  }, [selectedItem, labForms]);

  const displayFields = getFieldConfig(currentProduct?.standardNo);

  const shipmentDetails = selectedItem?.labShipmentDetails ?? null;
  const isAccepted =
    selectedItem?.labStatus === "ACCEPTED" || selectedItem?.labStatus === "APPROVED";

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
          currentProduct ? `${currentProduct.name} / ${currentProduct.standardNo ?? "Standart belirtilmedi"}` : undefined
        }
        width="lg"
        footer={null}
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

            {isAccepted ? (
              formData ? (
                <div className="space-y-4 text-sm text-slate-700">
                  {displayFields.map((field) => (
                    <div key={field.key} className="flex flex-col gap-1">
                      <span className="text-xs font-semibold text-slate-500">{field.label}</span>
                      <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                        {renderValue(formData[field.key])}
                      </span>
                    </div>
                  ))}
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-slate-500">Açıklama</span>
                    <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                      {renderValue(formData["notes"])}
                    </span>
                  </div>
                </div>
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



