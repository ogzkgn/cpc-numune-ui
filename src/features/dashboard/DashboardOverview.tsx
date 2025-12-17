import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";

import Card from "../../components/ui/Card";
import { AlertTriangle, Clock4, FlaskRound, SendHorizonal, ShieldAlert } from "lucide-react";
import { getPriorityFlag, getInspectionPriorityFlag } from "../../utils/date";
import type { CompanyProduct } from "../../types";
import { useCompanyProductRecordsQuery } from "../../queries/useCompanyProductRecordsQuery";
import { useTripsQuery } from "../../queries/useTripsQuery";
import { useProductsQuery } from "../../queries/useProductsQuery";
import { fetchTripCompletion, tripCompletionQueryKey } from "../../queries/useTripCompletionQuery";

const DashboardOverview = () => {
  const { data: companyProductRecords = [] } = useCompanyProductRecordsQuery();
  const { data: tripsData } = useTripsQuery();
  const { data: products = [] } = useProductsQuery();
  const trips = tripsData?.trips ?? [];
  const tripItems = tripsData?.tripItems ?? [];
  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const completionQueries = useQueries({
    queries: trips.map((trip) => ({
      queryKey: tripCompletionQueryKey(trip.id),
      queryFn: () => fetchTripCompletion(trip.id),
      staleTime: 60_000
    }))
  });
  const tripCompletions = completionQueries
    .map((query) => query.data)
    .filter((value): value is NonNullable<typeof value> => Boolean(value));

  const metrics = useMemo(() => {
    const sourceRecords = companyProductRecords;

    const activeRecords = sourceRecords
      .map((rec) => {
        const status = rec.status ?? "devam";
        if (status === "iptal" || status === "aski") return null;
        const product =
          rec.productId && productMap.has(rec.productId) ? productMap.get(rec.productId) : undefined;
        if (!product) return null;

        const asCompanyProduct: CompanyProduct = {
          id: rec.id ?? 0,
          companyId: 0,
          productId: rec.productId ?? 0,
          productCode: rec.productCode,
          lastSampleDate: rec.lastSampleDate,
          lastInspectionDate: rec.lastInspectionDate,
          status,
          samplingIntervalMonths: rec.samplingIntervalMonths,
          requiresSampling: rec.requiresSampling,
          labReturnDays: rec.labReturnDays,
          paymentStatus: rec.paymentStatus
        };

        return { rec, product, asCompanyProduct };
      })
      .filter((item): item is { rec: typeof sourceRecords[number]; product: any; asCompanyProduct: CompanyProduct } =>
        Boolean(item)
      );

    const currentYear = new Date().getFullYear();

    const countBySamplePriority = (target: "approaching" | "overdue") =>
      activeRecords.reduce((acc, item) => {
        return getPriorityFlag(item.asCompanyProduct, item.product) === target ? acc + 1 : acc;
      }, 0);

    const countByInspectionPriority = (target: "approaching" | "overdue") =>
      activeRecords.reduce((acc, item) => {
        return getInspectionPriorityFlag(item.asCompanyProduct) === target ? acc + 1 : acc;
      }, 0);

    const completedSamplesYtd = tripCompletions.reduce((acc, completion) => {
      const count = completion.entries.filter(
        (entry) => entry.performedAt && entry.sampleNotCompleted !== true && new Date(entry.performedAt).getFullYear() === currentYear
      ).length;
      return acc + count;
    }, 0);

    const completedInspectionsYtd = tripCompletions.reduce((acc, completion) => {
      const count = completion.entries.filter(
        (entry) => entry.inspectedAt && entry.inspectionNotCompleted !== true && new Date(entry.inspectedAt).getFullYear() === currentYear
      ).length;
      return acc + count;
    }, 0);

    const completedTrips = trips.filter((trip) => trip.status === "COMPLETED").length;

    const labCounts = {
      sentToLab: tripItems.filter((item) => item.labStatus === "SUBMITTED").length,
      waitingReturn: tripItems.filter(
        (item) =>
          item.labStatus === "WAITING_CONFIRM" ||
          item.labStatus === "ACCEPTED" ||
          item.labStatus === "APPROVED"
      ).length
    };

    return {
      approachingSamples: countBySamplePriority("approaching"),
      overdueSamples: countBySamplePriority("overdue"),
      approachingInspections: countByInspectionPriority("approaching"),
      overdueInspections: countByInspectionPriority("overdue"),
      completedSamplesYtd,
      completedInspectionsYtd,
      completedTrips,
      labCounts
    };
  }, [companyProductRecords, productMap, trips, tripCompletions, tripItems]);

  const Stat = ({
    label,
    value,
    icon,
    accentClass
  }: {
    label: string;
    value: number;
    icon?: React.ReactNode;
    accentClass?: string;
  }) => (
    <div className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white px-3 py-3 text-sm shadow-sm">
      <div className="flex items-center gap-3 text-slate-700">
        {icon ? <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${accentClass}`}>{icon}</span> : null}
        <span className="font-medium">{label}</span>
      </div>
      <span className="text-xl font-semibold text-slate-900">{value}</span>
    </div>
  );


  const YearStat = ({
    label,
    value,
    accentFrom,
    accentTo,
    accentText
  }: {
    label: string;
    value: number;
    accentFrom: string;
    accentTo: string;
    accentText: string;
  }) => (
    <div
      className="flex h-full min-h-[120px] flex-col items-center justify-center gap-2 rounded-xl border border-slate-200/70 px-4 py-4 text-center shadow-sm"
      style={{ backgroundImage: `linear-gradient(180deg, ${accentFrom}, ${accentTo})` }}
    >
      <span className="block text-xs font-semibold uppercase tracking-wide text-slate-700">{label}</span>
      <span className="block text-3xl font-extrabold" style={{ color: accentText }}>
        {value}
      </span>
    </div>
  );

  return (
    <div className="space-y-6">
      <Card header="Saha Öncelikleri" className="lg:col-span-2">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3 rounded-xl bg-amber-50/80 p-4 ring-1 ring-amber-100">
            <div className="flex items-center justify-between text-xs font-semibold uppercase text-amber-900">
              Numune Öncelikleri
              <Clock4 className="h-4 w-4" />
            </div>
            <Stat
              label="Yaklaşan Numune"
              value={metrics.approachingSamples}
              icon={<Clock4 className="h-4 w-4 text-amber-700" />}
              accentClass="bg-white text-amber-700 shadow-inner"
            />
            <Stat
              label="Gecikmiş Numune"
              value={metrics.overdueSamples}
              icon={<AlertTriangle className="h-4 w-4 text-red-600" />}
              accentClass="bg-white text-red-700 shadow-inner"
            />
          </div>

          <div className="space-y-3 rounded-xl bg-sky-50/80 p-4 ring-1 ring-sky-100">
            <div className="flex items-center justify-between text-xs font-semibold uppercase text-sky-900">
              Gözetim Öncelikleri
              <ShieldAlert className="h-4 w-4" />
            </div>
            <Stat
              label="Yaklaşan Gözetim"
              value={metrics.approachingInspections}
              icon={<Clock4 className="h-4 w-4 text-sky-700" />}
              accentClass="bg-white text-sky-700 shadow-inner"
            />
            <Stat
              label="Gecikmiş Gözetim"
              value={metrics.overdueInspections}
              icon={<ShieldAlert className="h-4 w-4 text-rose-600" />}
              accentClass="bg-white text-rose-700 shadow-inner"
            />
          </div>
        </div>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card header="Laboratuvar Süreci">
          <div className="space-y-3">
            <Stat
              label="Laba Gönderilen Numune Sayısı"
              value={metrics.labCounts.sentToLab}
              icon={<SendHorizonal className="h-4 w-4 text-blue-600" />}
              accentClass="bg-blue-50 text-blue-700"
            />
            <Stat
              label="Onay Beklenen Numune Sayısı"
              value={metrics.labCounts.waitingReturn}
              icon={<FlaskRound className="h-4 w-4 text-fuchsia-600" />}
              accentClass="bg-fuchsia-50 text-fuchsia-700"
            />
            
          </div>
        </Card>

        <Card header="Yıllık İlerleme">
          <div className="grid auto-rows-fr gap-4 md:grid-cols-3">
            <YearStat
              label="Bu Sene Alınan Numune Sayısı"
              value={metrics.completedSamplesYtd}
              accentFrom="#d1f6e5"
              accentTo="#a7e7c6"
              accentText="#0f5132"
            />
            <YearStat
              label="Bu Sene Alınan Gözetim Sayısı"
              value={metrics.completedInspectionsYtd}
              accentFrom="#e0f6df"
              accentTo="#b8eac8"
              accentText="#1b5e20"
            />
            <YearStat
              label="Tamamlanan Seyahat Sayısı"
              value={metrics.completedTrips}
              accentFrom="#e4e8ff"
              accentTo="#d4dcff"
              accentText="#1e3a8a"
            />
          </div>
        </Card>
      </div>
    </div>
  );
};

export default DashboardOverview;
