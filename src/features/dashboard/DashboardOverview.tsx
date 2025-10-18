import { useMemo } from "react";


import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Table from "../../components/ui/Table";
import Badge from "../../components/ui/Badge";
import type { BadgeVariant } from "../../components/ui/Badge";
import { useAppStore } from "../../state/useAppStore";
import { formatDate, getPriorityFlag, getInspectionPriorityFlag } from "../../utils/date";
import { useEntityMaps } from "../../hooks/useEntityMaps";
import type { TableColumn } from "../../components/ui/Table";
import type { CompanyProduct } from "../../types";
import type { PriorityFlag } from "../../utils/date";

type PrioritizedItem = {
  cp: CompanyProduct;
  samplePriority: ReturnType<typeof getPriorityFlag>;
  inspectionPriority: ReturnType<typeof getInspectionPriorityFlag>;
  score: number;
};

const DashboardOverview = () => {
  const { productMap, companyMap, siteMap } = useEntityMaps();
  const companyProducts = useAppStore((state) => state.companyProducts);
  const tripItems = useAppStore((state) => state.tripItems);
  const trips = useAppStore((state) => state.trips);
  const labForms = useAppStore((state) => state.labForms);
  const addToast = useAppStore((state) => state.addToast);

  const metrics = useMemo(() => {
    const dueConcrete = companyProducts.filter((cp) => {
      const product = productMap.get(cp.productId);
      return product?.productType === "concrete" && getPriorityFlag(cp, product) !== "ok";
    }).length;

    const dueCement = companyProducts.filter((cp) => {
      const product = productMap.get(cp.productId);
      return product?.productType === "cement" && getPriorityFlag(cp, product) !== "ok";
    }).length;

    const activeTrips = trips.filter((trip) => trip.status === "ACTIVE").length;

    const samplesInLab = {
      pending: tripItems.filter((item) => item.labStatus === "PENDING" || item.labStatus === "ACCEPTED").length,
      draft: tripItems.filter((item) => item.labStatus === "DRAFT").length,
      submitted: tripItems.filter((item) => item.labStatus === "SUBMITTED").length
    };

    const avgTurnaround = labForms.length ? 6.2 : 0;

    const topPrioritized = [...companyProducts]
      .map<PrioritizedItem | null>((cp) => {
        const product = productMap.get(cp.productId);
        if (!product) return null;
        const samplePriority = getPriorityFlag(cp, product);
        const inspectionPriority = getInspectionPriorityFlag(cp);
        const score =
          (samplePriority === "overdue" ? 3 : samplePriority === "approaching" ? 1 : 0) +
          (inspectionPriority === "overdue" ? 3 : inspectionPriority === "approaching" ? 1 : 0);
        return {
          cp,
          samplePriority,
          inspectionPriority,
          score
        };
      })
      .filter((item): item is PrioritizedItem => item !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    return {
      dueConcrete,
      dueCement,
      activeTrips,
      samplesInLab,
      avgTurnaround,
      topPrioritized
    };
  }, [companyProducts, productMap, trips, labForms, tripItems]);

  const getPriorityMeta = (flag: PriorityFlag): { label: string; variant: BadgeVariant } => ({
    label: flag === "overdue" ? "Gecikmiş" : flag === "approaching" ? "Yaklaşıyor" : "Uygun",
    variant: flag === "overdue" ? "danger" : flag === "approaching" ? "warning" : "success"
  });

  const columns: TableColumn<PrioritizedItem>[] = [
    {
      id: "company",
      header: "Firma / Ürün",
      cell: (item) => {
        const company = companyMap.get(item.cp.companyId)?.name ?? "-";
        const product = productMap.get(item.cp.productId)?.name ?? "-";
        return (
          <div className="flex flex-col">
            <span className="font-medium text-slate-900">{company}</span>
            <span className="text-xs text-slate-500">{product}</span>
          </div>
        );
      },
    },
    {
      id: "location",
      header: "İl / İlçe",
      cell: (item) => {
        const site = item.cp.siteId ? siteMap.get(item.cp.siteId) : undefined;
        if (!site) return "-";
        return site.district ? `${site.city} / ${site.district}` : site.city ?? "-";
      }
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
      id: "status",
      header: "Durum",
      cell: (item) => {
        const sampleMeta = getPriorityMeta(item.samplePriority);
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

  const getRowClassName = (item: PrioritizedItem) => {
    const hasOverdue = item.samplePriority === "overdue" || item.inspectionPriority === "overdue";
    if (hasOverdue) return "bg-red-50";
    const hasApproaching = item.samplePriority === "approaching" || item.inspectionPriority === "approaching";
    if (hasApproaching) return "bg-amber-50";
    return "bg-green-50";
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card
          header={
            <div className="flex items-center justify-between">
              <span>Bu Ay Beton</span>
              <Badge variant="warning">Öncelik</Badge>
            </div>
          }
        >
          <p className="text-3xl font-semibold text-slate-900">{metrics.dueConcrete}</p>
          <p className="text-xs text-slate-500">Son numunesi yaklaşan beton eşleşmeleri</p>
        </Card>
        <Card
          header={
            <div className="flex items-center justify-between">
              <span>Bu Ay Çimento</span>
              <Badge variant="warning">Öncelik</Badge>
            </div>
          }
        >
          <p className="text-3xl font-semibold text-slate-900">{metrics.dueCement}</p>
          <p className="text-xs text-slate-500">Son numunesi yaklaşan çimento eşleşmeleri</p>
        </Card>
        <Card header="Aktif Seyahatler">
          <p className="text-3xl font-semibold text-slate-900">{metrics.activeTrips}</p>
          <p className="text-xs text-slate-500">Planlanan ve sahada olan seyahatler</p>
        </Card>
        <Card header="Lab İş Yükü">
          <div className="space-y-1 text-sm">
            <div className="flex items-center justify-between">
              <span>Teslim / Bekliyor</span>
              <strong>{metrics.samplesInLab.pending}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span>Taslak</span>
              <strong>{metrics.samplesInLab.draft}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span>Gönderildi</span>
              <strong>{metrics.samplesInLab.submitted}</strong>
            </div>
            <p className="pt-2 text-xs text-slate-500">Ortalama sonuç süresi ~{metrics.avgTurnaround} gün</p>
          </div>
        </Card>
      </div>

      <div className="flex flex-col gap-4 xl:flex-row">
        <Card className="flex-1" header="Öncelikli Firma-Ürünler">
          <Table
            data={metrics.topPrioritized}
            columns={columns}
            keyExtractor={(item) => item.cp.id}
            emptyState="Öncelikli kayıt bulunmuyor"
            rowClassName={getRowClassName}
          />
        </Card>
        <Card className="w-full xl:max-w-xs" header="Hızlı İşlemler">
          <div className="flex flex-col gap-3">
            <Button onClick={() => addToast({ title: "Seyahat şablonu açılacak", variant: "info" })}>Seyahat Oluştur</Button>
            <Button
              variant="secondary"
              onClick={() =>
                addToast({
                  title: "E-posta hatırlatıcıları hazır",
                  description: "İletim için entegrasyon bekleniyor",
                  variant: "info"
                })
              }
            >
              Hatırlatma Gönder
            </Button>
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-xs text-slate-500">
              Demo: Bu butonlar gerçek işlemleri taklit eder, toast ile geri bildirim sağlar.
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default DashboardOverview;
