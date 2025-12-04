import { useEffect, useMemo, useState } from "react";
import { Filter, Plus, RotateCw } from "lucide-react";

import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import type { BadgeVariant } from "../../components/ui/Badge";
import Drawer from "../../components/ui/Drawer";
import Table from "../../components/ui/Table";
import Chip from "../../components/ui/Chip";
import { useAppStore } from "../../state/useAppStore";
import { formatDate, calculateNextDueDate, getPriorityFlag, getInspectionPriorityFlag } from "../../utils/date";
import { getProductTypeLabel, paymentStatusLabels, paymentStatusTokens } from "../../utils/labels";
import { buildSampleCounts, getAnnualRequiredSampleCount } from "../../utils/samples";
import type {
  CompanyProduct,
  CompanyProductRecord,
  CompanyProductStatus,
  ProductType,
  PaymentStatus
} from "../../types";
import type { TableColumn } from "../../components/ui/Table";
import type { PriorityFlag } from "../../utils/date";

type PriorityKey = "overdue" | "approaching";

interface Filters {
  productTypes: ProductType[];
  city?: string;
  standardNo?: string;
  customerCode?: string;
  samplePriority?: PriorityKey;
  inspectionPriority?: PriorityKey;
  companyName?: string;
  productCode?: string;
  productName?: string;
  paymentStatuses: PaymentStatus[];
  lastSampleDateFrom?: string;
  lastInspectionDateFrom?: string;
  certificateDateFrom?: string;
}

const defaultFilters: Filters = {
  productTypes: [],
  paymentStatuses: []
};

const priorityLabel: Record<PriorityKey, string> = {
  overdue: "Gecikmiş",
  approaching: "Yaklaşıyor"
};

const buildRecordKey = (record: CompanyProductRecord) =>
  `${record.companyName}__${record.productId ?? record.productType}__${record.productCode ?? record.standard ?? ""}`;

const statusLabels: Record<CompanyProductStatus, string> = {
  devam: "Devam",
  kesikli: "Kesikli",
  aski: "Askı",
  iptal: "İptal"
};

const statusClassMap: Record<CompanyProductStatus, string> = {
  devam: "bg-green-100 text-green-700",
  kesikli: "bg-amber-100 text-amber-700",
  aski: "bg-slate-200 text-slate-700",
  iptal: "bg-red-100 text-red-700"
};

const getPriorityMeta = (flag: PriorityFlag): { label: string; variant: BadgeVariant } => ({
  label: flag === "overdue" ? "Gecikmiş" : flag === "approaching" ? "Yaklaşıyor" : "Tamamlandı",
  variant: flag === "overdue" ? "danger" : flag === "approaching" ? "warning" : "success"
});

const DueThisMonthView = () => {
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [isFilterOpen, setFilterOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const companyProductRecords = useAppStore((state) => state.companyProductRecords);
  const loadCompanyProductRecords = useAppStore((state) => state.loadCompanyProductRecords);
  const loadProducts = useAppStore((state) => state.loadProducts);
  const loadTrips = useAppStore((state) => state.loadTrips);
  const products = useAppStore((state) => state.products);
  const openTripPlanner = useAppStore((state) => state.openTripPlanner);
  const addToast = useAppStore((state) => state.addToast);
  const tripItems = useAppStore((state) => state.tripItems);

  useEffect(() => {
    loadProducts();
    loadCompanyProductRecords();
    loadTrips();
  }, [loadProducts, loadCompanyProductRecords, loadTrips]);

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const currentYear = new Date().getFullYear();
  const sampleCounts = useMemo(() => buildSampleCounts(tripItems, currentYear), [tripItems, currentYear]);

  const list = useMemo(() => {
    return companyProductRecords
      .map((record) => {
        const product = record.productId ? productMap.get(record.productId) : undefined;
        if (!product) return null;

        const asCompanyProduct: CompanyProduct = {
          id: record.id ?? 0,
          companyId: 0,
          productId: product.id,
          productCode: record.productCode,
          lastSampleDate: record.lastSampleDate,
          lastInspectionDate: record.lastInspectionDate,
          status: record.status,
          paymentStatus: record.paymentStatus,
          samplingIntervalMonths: record.samplingIntervalMonths,
          requiresSampling: record.requiresSampling
        };

        const sampleCount = record.id ? sampleCounts.get(record.id) ?? 0 : 0;
        const status = (record.status ?? "devam") as CompanyProductStatus;
        if (status === "iptal" || status === "aski") return null;
        const sampleQuota = getAnnualRequiredSampleCount(record, product, status);
        const nextDue = calculateNextDueDate(asCompanyProduct, product);
        const priority = getPriorityFlag(asCompanyProduct, product);
        const inspectionPriority = getInspectionPriorityFlag(asCompanyProduct);
        const score =
          (priority === "overdue" ? 3 : priority === "approaching" ? 1 : 0) +
          (inspectionPriority === "overdue" ? 3 : inspectionPriority === "approaching" ? 1 : 0);

        const paymentStatus = (record.paymentStatus ?? "yapmadi") as PaymentStatus;
        if (paymentStatus === "yapmadi") return null;

        return {
          record,
          product,
          priority,
          inspectionPriority,
          score,
          nextDue,
          sampleCount,
          sampleQuota,
          paymentStatus
        } as const;
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .filter((item) => {
        const { record, priority, inspectionPriority, paymentStatus } = item;

        if (filters.productTypes.length > 0 && !filters.productTypes.includes(record.productType)) {
          return false;
        }

        if (filters.city && record.location !== filters.city) {
          return false;
        }

        if (filters.standardNo && record.standard !== filters.standardNo) {
          return false;
        }

        if (
          filters.customerCode &&
          !(record.btCode ?? "-").toLowerCase().includes(filters.customerCode.toLowerCase())
        ) {
          return false;
        }

        if (filters.samplePriority && priority !== filters.samplePriority) return false;
        if (filters.inspectionPriority && inspectionPriority !== filters.inspectionPriority) return false;

        if (
          filters.companyName &&
          !record.companyName.toLowerCase().includes(filters.companyName.toLowerCase())
        ) {
          return false;
        }

        if (
          filters.productCode &&
          !(record.productCode ?? "-").toLowerCase().includes(filters.productCode.toLowerCase())
        ) {
          return false;
        }

        if (
          filters.productName &&
          !(record.productName ?? "").toLowerCase().includes(filters.productName.toLowerCase())
        ) {
          return false;
        }

        if (filters.paymentStatuses.length > 0 && !filters.paymentStatuses.includes(paymentStatus)) {
          return false;
        }

        if (filters.lastSampleDateFrom && record.lastSampleDate) {
          if (record.lastSampleDate < filters.lastSampleDateFrom) return false;
        }

        if (filters.lastInspectionDateFrom && record.lastInspectionDate) {
          if (record.lastInspectionDate < filters.lastInspectionDateFrom) return false;
        }

        if (filters.certificateDateFrom && record.certificateDate) {
          if (record.certificateDate < filters.certificateDateFrom) return false;
        }

        return true;
      })
      .sort((a, b) => b.score - a.score);
  }, [companyProductRecords, productMap, filters, sampleCounts]);

  const availableProductTypes = useMemo(() => {
    const types = new Set<ProductType>();
    companyProductRecords.forEach((record) => {
      const product = record.productId ? productMap.get(record.productId) : undefined;
      if (product?.productType) {
        types.add(product.productType);
      }
      if (record.productType) {
        types.add(record.productType);
      }
    });
    return Array.from(types).sort((a, b) => getProductTypeLabel(a).localeCompare(getProductTypeLabel(b), "tr"));
  }, [companyProductRecords, productMap]);

  const uniqueCities = useMemo(() => {
    const values = new Set<string>();
    companyProductRecords.forEach((record) => {
      if (record.location) {
        values.add(record.location);
      }
    });
    return Array.from(values);
  }, [companyProductRecords]);

  const uniqueStandards = useMemo(() => {
    const values = new Set<string>();
    companyProductRecords.forEach((record) => {
      if (record.standard) {
        values.add(record.standard);
      }
    });
    return Array.from(values);
  }, [companyProductRecords]);

  const uniqueCompanies = useMemo(() => {
    const values = new Set<string>();
    companyProductRecords.forEach((record) => {
      if (record.companyName) {
        values.add(record.companyName);
      }
    });
    return Array.from(values);
  }, [companyProductRecords]);

  const uniqueProductNames = useMemo(() => {
    const values = new Set<string>();
    companyProductRecords.forEach((record) => {
      if (record.productName) {
        values.add(record.productName);
      }
    });
    return Array.from(values);
  }, [companyProductRecords]);

  const handleSelectRow = (item: (typeof list)[number], selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const id = item.record.id;
      if (id === undefined) return next;
      if (selected) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const tableColumns: TableColumn<(typeof list)[number]>[] = [
    {
      id: "productType",
      header: "Ürün Tipi",
      cell: (item) => getProductTypeLabel(item.record.productType)
    },
    {
      id: "productCode",
      header: "Ürün Kodu",
      cell: (item) => item.record.productCode ?? "-"
    },
    {
      id: "btCode",
      header: "BT Kod",
      cell: (item) => item.record.btCode ?? "-"
    },
    {
      id: "code",
      header: "Kod",
      cell: (item) => item.record.code ?? "-"
    },
    {
      id: "company",
      header: "Firma Adı",
      cell: (item) => item.record.companyName
    },
    {
      id: "city",
      header: "İl / İlçe",
      cell: (item) => item.record.location ?? "-"
    },
    {
      id: "product",
      header: "Ürün Adı / Ürün Sınıfı",
      cell: (item) => item.record.productName ?? item.product.name
    },
    {
      id: "standard",
      header: "Standart",
      cell: (item) => item.record.standard ?? item.product.standardNo ?? "-"
    },
    {
      id: "certificateDate",
      header: "Belge Tarihi",
      cell: (item) => formatDate(item.record.certificateDate)
    },
    {
      id: "lastSample",
      header: "Son Numune Tarihi",
      cell: (item) => formatDate(item.record.lastSampleDate)
    },
    {
      id: "lastInspection",
      header: "Son Denetim Tarihi",
      cell: (item) => formatDate(item.record.lastInspectionDate)
    },
    {
      id: "sampleCount",
      header: "Numune Sayısı",
      cell: (item) => `${item.sampleCount}/${item.sampleQuota}`
    },
    {
      id: "paymentStatus",
      header: "Ödeme Durumu",
      cell: (item) => {
        const status = item.paymentStatus;
        const label = paymentStatusLabels[status];
        const token = paymentStatusTokens[status];
        return <Badge className={token}>{label}</Badge>;
      }
    },
    {
      id: "dueMonth",
      header: "Numune Vadesi",
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
    },
    {
      id: "status",
      header: "Durum",
      cell: (item) => (
        <Badge className={`px-3 py-1 text-xs font-semibold ${statusClassMap[item.record.status ?? "devam"]}`}>
          {statusLabels[item.record.status ?? "devam"]}
        </Badge>
      )
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
            {getProductTypeLabel(type)}
          </Chip>
        ))}
        {filters.samplePriority ? (
          <Chip onRemove={() => setFilters((prev) => ({ ...prev, samplePriority: undefined }))}>
            Numune - {priorityLabel[filters.samplePriority]}
          </Chip>
        ) : null}
        {filters.inspectionPriority ? (
          <Chip onRemove={() => setFilters((prev) => ({ ...prev, inspectionPriority: undefined }))}>
            Gözetim - {priorityLabel[filters.inspectionPriority]}
          </Chip>
        ) : null}
        {filters.lastSampleDateFrom ? (
          <Chip onRemove={() => setFilters((prev) => ({ ...prev, lastSampleDateFrom: undefined }))}>
            Son Numune ≥ {formatDate(filters.lastSampleDateFrom)}
          </Chip>
        ) : null}
        {filters.lastInspectionDateFrom ? (
          <Chip onRemove={() => setFilters((prev) => ({ ...prev, lastInspectionDateFrom: undefined }))}>
            Son Denetim ≥ {formatDate(filters.lastInspectionDateFrom)}
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
        {filters.companyName ? (
          <Chip onRemove={() => setFilters((prev) => ({ ...prev, companyName: undefined }))}>
            {filters.companyName}
          </Chip>
        ) : null}
        {filters.productCode ? (
          <Chip onRemove={() => setFilters((prev) => ({ ...prev, productCode: undefined }))}>
            {filters.productCode}
          </Chip>
        ) : null}
        {filters.productName ? (
          <Chip onRemove={() => setFilters((prev) => ({ ...prev, productName: undefined }))}>
            {filters.productName}
          </Chip>
        ) : null}
        {filters.paymentStatuses.length > 0 ? (
          <Chip
            onRemove={() =>
              setFilters((prev) => ({
                ...prev,
                paymentStatuses: []
              }))
            }
          >
            {filters.paymentStatuses.map((status) => paymentStatusLabels[status]).join(", ")}
          </Chip>
        ) : null}
        {filters.certificateDateFrom ? (
          <Chip onRemove={() => setFilters((prev) => ({ ...prev, certificateDateFrom: undefined }))}>
            Belge Tarihi ≥ {formatDate(filters.certificateDateFrom)}
          </Chip>
        ) : null}
      </div>

      <Table
        columns={tableColumns}
        data={list}
        selectableRows
        selectedRowIds={selectedIds}
        onRowSelectChange={(row, selected) => handleSelectRow(row, selected)}
        keyExtractor={(item) => item.record.id ?? buildRecordKey(item.record)}
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
            <input
              list="productTypeOptions"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Ürün tipi seçin veya arayın"
              value={
                filters.productTypes[0]
                  ? getProductTypeLabel(filters.productTypes[0])
                  : ""
              }
              onChange={(event) =>
                setFilters((prev) => {
                  const label = event.target.value;
                  const matched = availableProductTypes.find(
                    (type) => getProductTypeLabel(type) === label
                  );
                  return {
                    ...prev,
                    productTypes: matched ? [matched] : []
                  };
                })
              }
            />
            <datalist id="productTypeOptions">
              {availableProductTypes.map((type) => (
                <option key={type} value={getProductTypeLabel(type)}>
                  {getProductTypeLabel(type)}
                </option>
              ))}
            </datalist>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-700">Şehir</h3>
            <input
              list="cityOptions"
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
            <datalist id="cityOptions">
              {uniqueCities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </datalist>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-700">Standart</h3>
            <input
              list="standardOptions"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Standart seçin veya arayın"
              value={filters.standardNo ?? ""}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  standardNo: event.target.value || undefined
                }))
              }
            />
            <datalist id="standardOptions">
              {uniqueStandards.map((standard) => (
                <option key={standard} value={standard}>
                  {standard}
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
              list="companyOptions"
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
            <datalist id="companyOptions">
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
              list="productNameOptions"
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
            <datalist id="productNameOptions">
              {uniqueProductNames.map((product) => (
                <option key={product} value={product}>
                  {product}
                </option>
              ))}
            </datalist>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-700">Ödeme Durumu</h3>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(paymentStatusLabels) as PaymentStatus[]).map((status) => {
                const active = filters.paymentStatuses.includes(status);
                return (
                  <Chip
                    key={status}
                    active={active}
                    className="cursor-pointer"
                    onClick={() =>
                      setFilters((prev) => ({
                        ...prev,
                        paymentStatuses: active
                          ? prev.paymentStatuses.filter((value) => value !== status)
                          : [...prev.paymentStatuses, status]
                      }))
                    }
                  >
                    {paymentStatusLabels[status]}
                  </Chip>
                );
              })}
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-700">Öncelik</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600 w-24">Numune</span>
                <div className="flex gap-2">
                  {(Object.keys(priorityLabel) as PriorityKey[]).map((value) => {
                    const active = filters.samplePriority === value;
                    return (
                      <Chip
                        key={`sampling-${value}`}
                        active={active}
                        className="cursor-pointer"
                        onClick={() =>
                          setFilters((prev) => ({
                            ...prev,
                            samplePriority: active ? undefined : value
                          }))
                        }
                      >
                        {priorityLabel[value]}
                      </Chip>
                    );
                  })}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600 w-24">Gözetim</span>
                <div className="flex gap-2">
                  {(Object.keys(priorityLabel) as PriorityKey[]).map((value) => {
                    const active = filters.inspectionPriority === value;
                    return (
                      <Chip
                        key={`inspection-${value}`}
                        active={active}
                        className="cursor-pointer"
                        onClick={() =>
                          setFilters((prev) => ({
                            ...prev,
                            inspectionPriority: active ? undefined : value
                          }))
                        }
                      >
                        {priorityLabel[value]}
                      </Chip>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-700">Son Numune Tarihi (sonrası)</h3>
            <input
              type="date"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={filters.lastSampleDateFrom ?? ""}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  lastSampleDateFrom: event.target.value || undefined
                }))
              }
            />
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-700">Son Denetim Tarihi (sonrası)</h3>
            <input
              type="date"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={filters.lastInspectionDateFrom ?? ""}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  lastInspectionDateFrom: event.target.value || undefined
                }))
              }
            />
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-700">Belge Tarihi (sonrası)</h3>
            <input
              type="date"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={filters.certificateDateFrom ?? ""}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  certificateDateFrom: event.target.value || undefined
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
    </div>
  );
};

export default DueThisMonthView;





