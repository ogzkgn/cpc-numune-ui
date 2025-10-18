import { useMemo, useState } from "react";
import { CheckCircle2, CircleOff, Edit, FileText, Info, Route as RouteIcon } from "lucide-react";

import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Modal from "../../components/ui/Modal";
import Table from "../../components/ui/Table";
import { useAppStore } from "../../state/useAppStore";
import { useEntityMaps } from "../../hooks/useEntityMaps";
import { formatDate } from "../../utils/date";
import { tripStatusLabels, tripStatusTokens } from "../../utils/labels";
import { openDrivingRoute } from "../../utils/maps";
import TripCompletionModal from "./TripCompletionModal";
import TripCompletionSummaryModal from "./TripCompletionSummaryModal";
import type { TableColumn } from "../../components/ui/Table";
import type { TripStatus } from "../../types";

const demoRouteAddresses = [
  "Ankara Ümitköy",
  "Gaziantep",
  "Kahramanmaraş",
  "Osmaniye",
  "Antalya"
];
interface TripFilters {
  status: "ALL" | TripStatus;
  assigneeId?: number;
  dateFrom?: string;
  dateTo?: string;
}

const defaultFilters: TripFilters = {
  status: "ALL"
};

const TripListView = () => {
  const [filters, setFilters] = useState<TripFilters>(defaultFilters);
  const [editingTripId, setEditingTripId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editPlannedAt, setEditPlannedAt] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [completionTripId, setCompletionTripId] = useState<number | null>(null);
  const [summaryTripId, setSummaryTripId] = useState<number | null>(null);
  const [financePreviewTripId, setFinancePreviewTripId] = useState<number | null>(null);

  const trips = useAppStore((state) => state.trips);
  const tripItems = useAppStore((state) => state.tripItems);
  const employees = useAppStore((state) => state.employees);
  const updateTripStatus = useAppStore((state) => state.updateTripStatus);
  const updateTrip = useAppStore((state) => state.updateTrip);
  const addToast = useAppStore((state) => state.addToast);
  const { companyProductMap, siteMap } = useEntityMaps();

  const summaries = useMemo(() => {
    const itemsByTrip = new Map<number, typeof tripItems>();
    tripItems.forEach((item) => {
      const list = itemsByTrip.get(item.tripId) ?? [];
      list.push(item);
      itemsByTrip.set(item.tripId, list);
    });

    return trips.map((trip) => {
      const items = itemsByTrip.get(trip.id) ?? [];
      const completed = items.filter((item) => item.sampled).length;
      const cities = new Set<string>();
      items.forEach((item) => {
        const cp = companyProductMap.get(item.companyProductId);
        if (cp?.siteId) {
          const site = siteMap.get(cp.siteId);
          if (site?.city) cities.add(site.city);
        }
      });

      return {
        trip,
        items,
        completed,
        cities: Array.from(cities)
      };
    });
  }, [trips, tripItems, companyProductMap, siteMap]);

  const filteredTrips = useMemo(() => {
    return summaries.filter((summary) => {
      if (filters.status !== "ALL" && summary.trip.status !== filters.status) {
        return false;
      }

      if (filters.assigneeId && !summary.trip.assigneeIds.includes(filters.assigneeId)) {
        return false;
      }

      if (filters.dateFrom && (!summary.trip.plannedAt || summary.trip.plannedAt < filters.dateFrom)) {
        return false;
      }

      if (filters.dateTo && (!summary.trip.plannedAt || summary.trip.plannedAt > filters.dateTo)) {
        return false;
      }

      return true;
    });
  }, [summaries, filters]);

  const handleOpenRoute = () => {
    openDrivingRoute(demoRouteAddresses);
  };

  const handleOpenEdit = (tripId: number) => {
    const trip = trips.find((item) => item.id === tripId);
    if (!trip) return;
    setEditingTripId(tripId);
    setEditName(trip.name ?? "");
    setEditPlannedAt(trip.plannedAt ? trip.plannedAt.slice(0, 16) : new Date().toISOString().slice(0, 16));
    setEditNotes(trip.notes ?? "");
  };

  const handleSaveEdit = () => {
    if (editingTripId === null) return;
    updateTrip(editingTripId, {
      name: editName || undefined,
      plannedAt: editPlannedAt ? new Date(editPlannedAt).toISOString() : undefined,
      notes: editNotes || undefined
    });
    addToast({ title: "Seyahat güncellendi", variant: "success" });
    setEditingTripId(null);
  };

  const columns: TableColumn<(typeof filteredTrips)[number]>[] = [
    {
      id: "name",
      header: "Seyahat",
      cell: (row) => row.trip.name ?? `Seyahat #${row.trip.id}`
    },
    {
      id: "status",
      header: "Durum",
      cell: (row) => <Badge className={tripStatusTokens[row.trip.status]}>{tripStatusLabels[row.trip.status]}</Badge>
    },
    {
      id: "planned",
      header: "Planlanan",
      cell: (row) => (row.trip.plannedAt ? formatDate(row.trip.plannedAt) : "Belirlenmedi")
    },
    {
      id: "assignees",
      header: "Ekip",
      cell: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.trip.assigneeIds.map((id) => {
            const emp = employees.find((employee) => employee.id === id);
            return <Badge key={id} variant="neutral">{emp?.name ?? `Personel #${id}`}</Badge>;
          })}
        </div>
      )
    },
    
    {
      id: "city",
      header: "Şehir",
      cell: (row) => (row.cities.length > 0 ? row.cities.join(", ") : "-")
    },
    {
      id: "actions",
      header: "İşlemler",
      cell: (row) => (
        <div className="flex gap-2">
          {row.trip.status === "COMPLETED" ? (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="secondary"
                icon={<FileText className="h-4 w-4" />}
                onClick={() => setFinancePreviewTripId(row.trip.id)}
              >
                Muhasebeye Gönder
              </Button>
              <Button
                size="sm"
                variant="ghost"
                icon={<Info className="h-4 w-4" />}
                onClick={() => setSummaryTripId(row.trip.id)}
              >
                Detay
              </Button>
            </div>
          ) : (
            <>
              <Button size="sm" variant="ghost" icon={<RouteIcon className="h-4 w-4" />} onClick={handleOpenRoute}>
                Rota
              </Button>
              <Button size="sm" variant="ghost" icon={<Edit className="h-4 w-4" />} onClick={() => handleOpenEdit(row.trip.id)}>
                Düzenle
              </Button>
              <Button
                size="sm"
                variant="secondary"
                icon={<CheckCircle2 className="h-4 w-4" />}
                onClick={() => setCompletionTripId(row.trip.id)}
              >
                Tamamla
              </Button>
              {row.trip.status !== "CANCELLED" ? (
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<CircleOff className="h-4 w-4" />}
                  onClick={() => {
                    updateTripStatus(row.trip.id, "CANCELLED");
                    addToast({ title: "Seyahat iptal edildi", variant: "info" });
                  }}
                >
                  İptal
                </Button>
              ) : null}
            </>
          )}
        </div>
      )
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Seyahatler</h1>
          <p className="text-sm text-slate-500">Planlanan, sahadaki ve tamamlanan saha organizasyonları</p>
        </div>
      </div>

      <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-4">
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Durum
          <select
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            value={filters.status}
            onChange={(event) =>
              setFilters((prev) => ({
                ...prev,
                status: event.target.value as TripFilters["status"]
              }))
            }
          >
            <option value="ALL">Tamamı</option>
            <option value="PLANNED">Planlandı</option>
            <option value="ACTIVE">Aktif</option>
            <option value="COMPLETED">Tamamlandı</option>
            <option value="CANCELLED">İptal</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Saha Personeli
          <select
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            value={filters.assigneeId ?? ""}
            onChange={(event) =>
              setFilters((prev) => ({
                ...prev,
                assigneeId: event.target.value ? Number(event.target.value) : undefined
              }))
            }
          >
            <option value="">Tamam</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Başlangıç Tarihi
          <input
            type="date"
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            value={filters.dateFrom ?? ""}
            onChange={(event) =>
              setFilters((prev) => ({
                ...prev,
                dateFrom: event.target.value || undefined
              }))
            }
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Bitiş Tarihi
          <input
            type="date"
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            value={filters.dateTo ?? ""}
            onChange={(event) =>
              setFilters((prev) => ({
                ...prev,
                dateTo: event.target.value || undefined
              }))
            }
          />
        </label>
      </div>

      <Table
        columns={columns}
        data={filteredTrips}
        keyExtractor={(row) => row.trip.id}
        emptyState="Filtrelerle eşleşen seyahat bulunmuyor"
      />

      <Modal
        open={editingTripId !== null}
        onClose={() => setEditingTripId(null)}
        title="Seyahat Bilgilerini Düzenle"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setEditingTripId(null)}>
              Vazgeç
            </Button>
            <Button onClick={handleSaveEdit}>Kaydet</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Seyahat Adı
            <input
              value={editName}
              onChange={(event) => setEditName(event.target.value)}
              placeholder="Örn. Marmara saha turu"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Planlanan Tarih / Saat
            <input
              type="datetime-local"
              value={editPlannedAt}
              onChange={(event) => setEditPlannedAt(event.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Notlar
            <textarea
              rows={4}
              value={editNotes}
              onChange={(event) => setEditNotes(event.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
        </div>
      </Modal>
      <TripCompletionModal
        tripId={completionTripId}
        open={completionTripId !== null}
        onClose={() => setCompletionTripId(null)}
      />
      <TripCompletionSummaryModal
        tripId={summaryTripId}
        open={summaryTripId !== null}
        onClose={() => setSummaryTripId(null)}
      />
      <TripCompletionSummaryModal
        tripId={financePreviewTripId}
        open={financePreviewTripId !== null}
        onClose={() => setFinancePreviewTripId(null)}
        mode="pdf"
      />
    </div>
  );
};

export default TripListView;


