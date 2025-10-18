import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Calendar, CheckSquare, Send, ShieldCheck, Square, SquareCheckBig } from "lucide-react";

import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Modal from "../../components/ui/Modal";
import Table from "../../components/ui/Table";
import { useAppStore } from "../../state/useAppStore";
import { useEntityMaps } from "../../hooks/useEntityMaps";
import { formatDate } from "../../utils/date";
import { employeeStatusTokens, labStatusLabels, labStatusTokens, tripStatusLabels, tripStatusTokens } from "../../utils/labels";
import type { TableColumn } from "../../components/ui/Table";
import TripCompletionModal from "./TripCompletionModal";

const TripDetailView = () => {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const numericId = Number(tripId);

  const trip = useAppStore((state) => state.trips.find((item) => item.id === numericId));
  const tripItems = useAppStore((state) => state.tripItems.filter((item) => item.tripId === numericId));
  const employees = useAppStore((state) => state.employees);
  const companyProducts = useAppStore((state) => state.companyProducts);
  const markSampleTaken = useAppStore((state) => state.markSampleTaken);
  const updateTripStatus = useAppStore((state) => state.updateTripStatus);
  const updateTripItemLabStatus = useAppStore((state) => state.updateTripItemLabStatus);
  const addToast = useAppStore((state) => state.addToast);
  const { productMap, companyMap, siteMap } = useEntityMaps();

  const [selectedItemIds, setSelectedItemIds] = useState<Set<number>>(new Set());
  const [sampleModalOpen, setSampleModalOpen] = useState(false);
  const [completionModalOpen, setCompletionModalOpen] = useState(false);
  const [sampleDate, setSampleDate] = useState(() => new Date().toISOString().slice(0, 10));

  const tripSummary = useMemo(() => {
    if (!trip) return null;

    const items = tripItems.map((item) => {
      const cp = companyProducts.find((cpItem) => cpItem.id === item.companyProductId);
      const product = cp ? productMap.get(cp.productId) : undefined;
      const company = cp ? companyMap.get(cp.companyId) : undefined;
      const site = cp?.siteId ? siteMap.get(cp.siteId) : undefined;

      return {
        item,
        cp,
        product,
        company,
        site
      };
    });

    const completed = items.filter((entry) => entry.item.sampled).length;

    return {
      trip,
      items,
      completed
    };
  }, [trip, tripItems, companyProducts, productMap, companyMap, siteMap]);

  if (!trip || !tripSummary) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-slate-900">Seyahat bulunamadÄ±</h1>
        <Button onClick={() => navigate(-1)}>Geri DÃ¶n</Button>
      </div>
    );
  }

  const { items } = tripSummary;

  const columns: TableColumn<typeof items[number]>[] = [
    {
      id: "select",
      header: "",
      width: "48px",
      cell: (row) => (
        <button type="button" onClick={() => toggleSelection(row.item.id)} className="text-brand-primary">
          {selectedItemIds.has(row.item.id) ? <SquareCheckBig className="h-5 w-5" /> : <Square className="h-5 w-5" />}
        </button>
      )
    },
    {
      id: "company",
      header: "Firma",
      cell: (row) => row.company?.name ?? "-"
    },
    {
      id: "city",
      header: "Åehir",
      cell: (row) => row.site?.city ?? "-"
    },
    {
      id: "product",
      header: "ÃœrÃ¼n",
      cell: (row) => (row.product ? `${row.product.name}${row.product.standardNo ? ` (${row.product.standardNo})` : ""}` : "-")
    },
    {
      id: "prev",
      header: "Ã–nceki Numune",
      cell: (row) => (row.cp ? formatDate(row.cp.lastSampleDate) : "-")
    },
    {
      id: "sampled",
      header: "Numune Durumu",
      cell: (row) => (row.item.sampled ? "AlÄ±ndÄ±" : "Bekliyor")
    },
    {
      id: "date",
      header: "AlÄ±m Tarihi",
      cell: (row) => (row.item.sampledAt ? formatDate(row.item.sampledAt) : "-")
    },
    {
      id: "lab",
      header: "Lab Durumu",
      cell: (row) => (
        <Badge className={labStatusTokens[row.item.labStatus ?? "PENDING"]}>
          {labStatusLabels[row.item.labStatus ?? "PENDING"]}
        </Badge>
      )
    },
    {
      id: "actions",
      header: "Ä°ÅŸlemler",
      cell: (row) => (
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" icon={<Calendar className="h-4 w-4" />} onClick={() => openSampleModal([row.item.id])}>
            Numune AlÄ±nma Tarihi
          </Button>
          <Button size="sm" variant="ghost" icon={<Send className="h-4 w-4" />} onClick={() => handleSendToLab(row.item.id)}>
            Laba GÃ¶nder
          </Button>
        </div>
      )
    }
  ];

  const toggleSelection = (id: number) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const openSampleModal = (ids: number[]) => {
    setSelectedItemIds(new Set(ids));
    setSampleDate(new Date().toISOString().slice(0, 10));
    setSampleModalOpen(true);
  };

  const confirmSample = () => {
    const payload = Array.from(selectedItemIds).map((id) => ({
      tripItemId: id,
      sampledAt: sampleDate
    }));
    markSampleTaken(payload);
    setSampleModalOpen(false);
    addToast({ title: "Numune bilgisi gÃ¼ncellendi", variant: "success" });
  };

  const handleSendToLab = (itemId: number) => {
    updateTripItemLabStatus(itemId, "PENDING", { sentAt: new Date().toISOString() });
    addToast({ title: "Numune laboratuvara gÃ¶nderildi", variant: "info" });
  };

  const selectedAssignees = trip.assigneeIds
    .map((id) => employees.find((employee) => employee.id === id))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-slate-900">{trip.name ?? `Seyahat #${trip.id}`}</h1>
            <Badge className={tripStatusTokens[trip.status]}>{tripStatusLabels[trip.status]}</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <span>Planlanan: {trip.plannedAt ? formatDate(trip.plannedAt) : "Belirlenmedi"}</span>
            <span>Numune Durumu: {tripSummary.completed}/{tripItems.length}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedAssignees.map((assignee) => (
              <Badge key={assignee.id} className={employeeStatusTokens[assignee.status]}>
                {assignee.name}
              </Badge>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            icon={<CheckSquare className="h-4 w-4" />}
            onClick={() => setCompletionModalOpen(true)}
            disabled={trip.status === "COMPLETED"}
          >
            Tamamla
          </Button>
          <Button
            variant="ghost"
            icon={<ShieldCheck className="h-4 w-4" />}
            onClick={() => {
              updateTripStatus(trip.id, "ACTIVE");
              addToast({ title: "Seyahat aktifleÅŸtirildi", variant: "info" });
            }}
            disabled={trip.status === "ACTIVE"}
          >
            Aktif Et
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">Numune Listesi</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openSampleModal(Array.from(selectedItemIds))}
            disabled={selectedItemIds.size === 0}
          >
            SeÃ§ili {selectedItemIds.size} numune iÃ§in Tarih Gir
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelectedItemIds(new Set())}>
            SeÃ§imi Temizle
          </Button>
        </div>
      </div>

      <Table columns={columns} data={items} keyExtractor={(row) => row.item.id} emptyState="Bu seyahat için numune kaydı yok" />

      <Modal
        open={sampleModalOpen}
        onClose={() => setSampleModalOpen(false)}
        title="Numune Tarihini GÃ¼ncelle"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setSampleModalOpen(false)}>
              Vazgeç
            </Button>
            <Button onClick={confirmSample}>Kaydet</Button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-600">{selectedItemIds.size} numune için numune alınma tarihini belirleyin.</p>
          <input
            type="date"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={sampleDate}
            onChange={(event) => setSampleDate(event.target.value)}
          />
        </div>
      </Modal>
      <TripCompletionModal
        tripId={completionModalOpen ? trip.id : null}
        open={completionModalOpen}
        onClose={() => setCompletionModalOpen(false)}
      />
    </div>
  );
};

export default TripDetailView;
