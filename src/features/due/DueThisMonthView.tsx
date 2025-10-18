import { useMemo, useState } from "react";
import { Filter, Plus, RotateCw } from "lucide-react";

import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import type { BadgeVariant } from "../../components/ui/Badge";
import Drawer from "../../components/ui/Drawer";
import Table from "../../components/ui/Table";
import Chip from "../../components/ui/Chip";
import { useAppStore } from "../../state/useAppStore";
import { useEntityMaps } from "../../hooks/useEntityMaps";
import { formatDate, calculateNextDueDate, getPriorityFlag, getInspectionPriorityFlag } from "../../utils/date";
import { productTypeLabels } from "../../utils/labels";
import { buildAnnualSampleCounts, getRequiredSampleCount } from "../../utils/samples";
import type { ProductType } from "../../types";
import type { TableColumn } from "../../components/ui/Table";
import type { PriorityFlag } from "../../utils/date";

type PriorityKey = "overdue" | "approaching";

interface Filters {
  productTypes: ProductType[];
  city?: string;
  standardNo?: string;
  customerCode?: string;
  priority?: PriorityKey;
}

const defaultFilters: Filters = {
  productTypes: []
};

const priorityLabel: Record<PriorityKey, string> = {
  overdue: "Gecikmiş",
  approaching: "Yaklaşıyor"
};

const getPriorityMeta = (flag: PriorityFlag): { label: string; variant: BadgeVariant } => ({
  label: flag === "overdue" ? "Gecikmiş" : flag === "approaching" ? "Yaklaşıyor" : "Uygun",
  variant: flag === "overdue" ? "danger" : flag === "approaching" ? "warning" : "success"
});

const DueThisMonthView = () => {
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [isFilterOpen, setFilterOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const companyProducts = useAppStore((state) => state.companyProducts);
  const openTripPlanner = useAppStore((state) => state.openTripPlanner);
  const addToast = useAppStore((state) => state.addToast);
  const tripItems = useAppStore((state) => state.tripItems);
  const tripCompletions = useAppStore((state) => state.tripCompletions);

  const { productMap, companyMap, siteMap } = useEntityMaps();

  const currentYear = new Date().getFullYear();
  const sampleCounts = useMemo(
    () => buildAnnualSampleCounts(tripItems, tripCompletions, currentYear),
    [tripItems, tripCompletions, currentYear]
  );

  const list = useMemo(() => {
    return companyProducts
      .map((cp) => {
        const product = productMap.get(cp.productId);
        const company = companyMap.get(cp.companyId);
        if (!product || !company) return null;

        const sampleCount = sampleCounts.get(cp.id) ?? 0;
        const sampleQuota = getRequiredSampleCount(product.productType);
        const nextDue = calculateNextDueDate(cp, product);
        const priority = getPriorityFlag(cp, product);
        const inspectionPriority = getInspectionPriorityFlag(cp);
        const score =
          (priority === "overdue" ? 3 : priority === "approaching" ? 1 : 0) +
          (inspectionPriority === "overdue" ? 3 : inspectionPriority === "approaching" ? 1 : 0);

        return {
          cp,
          product,
          company,
          site: cp.siteId ? siteMap.get(cp.siteId) : undefined,
          priority,
          inspectionPriority,
          score,
          nextDue,
          sampleCount,
          sampleQuota
        } as const;
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .filter((item) => {
        const { product, company, site, priority } = item;

        if (filters.productTypes.length > 0 && !filters.productTypes.includes(product.productType)) {
          return false;
        }

        if (filters.city && site?.city !== filters.city) {
          return false;
        }

        if (filters.standardNo && product.standardNo !== filters.standardNo) {
          return false;
        }

        if (
          filters.customerCode &&
          !company.customerCode?.toLowerCase().includes(filters.customerCode.toLowerCase())
        ) {
          return false;
        }

        if (filters.priority && priority !== filters.priority) {
          return false;
        }

        return true;
      })
      .sort((a, b) => b.score - a.score);
  }, [companyProducts, productMap, companyMap, siteMap, filters, sampleCounts]);

  const uniqueCities = useMemo(() => {
    const values = new Set<string>();
    companyProducts.forEach((cp) => {
      const site = cp.siteId ? siteMap.get(cp.siteId) : undefined;
      if (site?.city) {
        values.add(site.city);
      }
    });
    return Array.from(values);
  }, [companyProducts, siteMap]);

  const uniqueStandards = useMemo(() => {
    const values = new Set<string>();
    companyProducts.forEach((cp) => {
      const product = productMap.get(cp.productId);
      if (product?.standardNo) {
        values.add(product.standardNo);
      }
    });
    return Array.from(values);
  }, [companyProducts, productMap]);

  const handleSelectRow = (item: (typeof list)[number], selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selected) {
        next.add(item.cp.id);
      } else {
        next.delete(item.cp.id);
      }
      return next;
    });
  };

  const tableColumns: TableColumn<(typeof list)[number]>[] = [
    {
      id: "company",
      header: "Firma",
      cell: (item) => item.company.name
    },
    {
      id: "btCode",
      header: "BT Kod",
      cell: (item) => item.company.customerCode ?? "-"
    },
    {
      id: "city",
      header: "Şehir",
      cell: (item) => item.site?.city ?? "-"
    },
    {
      id: "product",
      header: "Ürün",
      cell: (item) => item.product.name
    },
    {
      id: "standard",
      header: "Standart",
      cell: (item) => item.product.standardNo ?? "-"
    },
    {
      id: "certificateDate",
      header: "Sertifika Tarihi",
      cell: (item) => formatDate(item.cp.certificateDate)
    },
    {
      id: "lastSample",
      header: "Son Numune",
      cell: (item) => formatDate(item.cp.lastSampleDate)
    },
    {
      id: "lastInspection",
      header: "Son Gözetim",
      cell: (item) => formatDate(item.cp.lastInspectionDate)
    },
    {
      id: "sampleCount",
      header: "Numune Sayısı",
      cell: (item) => `${item.sampleCount}/${item.sampleQuota}`
    },
    {
      id: "dueMonth",
      header: "Numune Vade",
      cell: (item) => (item.nextDue ? formatDate(item.nextDue.toISOString(), "-", { month: "long" }) : "-")
    },
    {
      id: "priority",
      header: "Öncelik",
      cell: (item) => {
        const sampleMeta = getPriorityMeta(item.priority);
        const inspectionMeta = getPriorityMeta(item.inspectionPriority);
        return (
          <div className="space-y-1 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-700">Numune</span>
              <Badge variant={sampleMeta.variant}>{sampleMeta.label}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-700">Gözetim</span>
              <Badge variant={inspectionMeta.variant}>{inspectionMeta.label}</Badge>
            </div>
          </div>
        );
      }
    }
  ];

  const handleResetFilters = () => {
    setFilters(defaultFilters);
  };

  const handleCreateTrip = () => {
    if (selectedIds.size === 0) {
      addToast({
        title: "Seçim yapın",
        description: "Seyahat oluşturmak için kayıt seçmelisiniz",
        variant: "error"
      });
      return;
    }
    openTripPlanner(Array.from(selectedIds));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Vade Takibi ve Planlama</h1>
          <p className="text-sm text-slate-500">
            Vadesi yaklaşan ve geciken firma-ürün takip ve planlama ekranı
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" icon={<Filter className="h-4 w-4" />} onClick={() => setFilterOpen(true)}>
            Filtrele
          </Button>
          <Button variant="ghost" size="sm" icon={<RotateCw className="h-3.5 w-3.5" />} onClick={handleResetFilters}>
            Sıfırla
          </Button>
          <Button icon={<Plus className="h-4 w-4" />} onClick={handleCreateTrip}>
            Seyahat Oluştur
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.productTypes.map((type) => (
          <Chip
            key={type}
            onRemove={() =>
              setFilters((prev) => ({
                ...prev,
                productTypes: prev.productTypes.filter((t) => t !== type)
              }))
            }
          >
            {productTypeLabels[type]}
          </Chip>
        ))}
        {filters.priority ? (
          <Chip onRemove={() => setFilters((prev) => ({ ...prev, priority: undefined }))}>
            {priorityLabel[filters.priority]}
          </Chip>
        ) : null}
        {filters.city ? (
          <Chip onRemove={() => setFilters((prev) => ({ ...prev, city: undefined }))}>{filters.city}</Chip>
        ) : null}
        {filters.standardNo ? (
          <Chip onRemove={() => setFilters((prev) => ({ ...prev, standardNo: undefined }))}>
            {filters.standardNo}
          </Chip>
        ) : null}
        {filters.customerCode ? (
          <Chip onRemove={() => setFilters((prev) => ({ ...prev, customerCode: undefined }))}>
            {filters.customerCode}
          </Chip>
        ) : null}
      </div>

      <Table
        columns={tableColumns}
        data={list}
        selectableRows
        selectedRowIds={selectedIds}
        onRowSelectChange={(row, selected) => handleSelectRow(row, selected)}
        keyExtractor={(item) => item.cp.id}
        emptyState="Bu ay için kritik kayıt bulunmuyor"
        rowClassName={(item) => {
          if (item.priority === "overdue" || item.inspectionPriority === "overdue") return "bg-red-50";
          if (item.priority === "approaching" || item.inspectionPriority === "approaching") return "bg-amber-50";
          return "bg-green-50";
        }}
      />

      <Drawer open={isFilterOpen} onClose={() => setFilterOpen(false)} title="Filtreler">
        <div className="space-y-6">
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-700">Ürün Tipi</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(productTypeLabels).map(([key, label]) => {
                const type = key as ProductType;
                const active = filters.productTypes.includes(type);
                return (
                  <Chip
                    key={type}
                    active={active}
                    className="cursor-pointer"
                    onClick={() =>
                      setFilters((prev) => ({
                        ...prev,
                        productTypes: active
                          ? prev.productTypes.filter((t) => t !== type)
                          : [...prev.productTypes, type]
                      }))
                    }
                  >
                    {label}
                  </Chip>
                );
              })}
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-700">Şehir</h3>
            <select
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={filters.city ?? ""}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  city: event.target.value || undefined
                }))
              }
            >
              <option value="">Hepsi</option>
              {uniqueCities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-700">Standart</h3>
            <select
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={filters.standardNo ?? ""}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  standardNo: event.target.value || undefined
                }))
              }
            >
              <option value="">Hepsi</option>
              {uniqueStandards.map((standard) => (
                <option key={standard} value={standard}>
                  {standard}
                </option>
              ))}
            </select>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-700">Müşteri Kodu</h3>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Örn. AHB"
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
            <h3 className="text-sm font-semibold text-slate-700">Öncelik</h3>
            <div className="flex gap-2">
              {(Object.keys(priorityLabel) as PriorityKey[]).map((value) => {
                const active = filters.priority === value;
                return (
                  <Chip
                    key={value}
                    active={active}
                    className="cursor-pointer"
                    onClick={() =>
                      setFilters((prev) => ({
                        ...prev,
                        priority: active ? undefined : value
                      }))
                    }
                  >
                    {priorityLabel[value]}
                  </Chip>
                );
              })}
            </div>
          </section>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={handleResetFilters}>
              Temizle
            </Button>
            <Button onClick={() => setFilterOpen(false)}>Uygula</Button>
          </div>
        </div>
      </Drawer>
    </div>
  );
};

export default DueThisMonthView;

