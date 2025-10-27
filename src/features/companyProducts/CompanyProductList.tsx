import { useMemo, useState } from "react";
import { Edit3 } from "lucide-react";

import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Modal from "../../components/ui/Modal";
import Table from "../../components/ui/Table";
import { useAppStore } from "../../state/useAppStore";
import { useEntityMaps } from "../../hooks/useEntityMaps";
import { formatDate } from "../../utils/date";
import { buildAnnualSampleCounts, getRequiredSampleCount } from "../../utils/samples";
import { paymentStatusLabels, paymentStatusTokens } from "../../utils/labels";
import type { TableColumn } from "../../components/ui/Table";
import type { CompanyProduct, CompanyProductStatus, PaymentStatus } from "../../types";

const CompanyProductList = () => {
  const companyProducts = useAppStore((state) => state.companyProducts);
  const companies = useAppStore((state) => state.companies);
  const sites = useAppStore((state) => state.sites);
  const products = useAppStore((state) => state.products);
  const updateCompanyProduct = useAppStore((state) => state.updateCompanyProduct);
  const setCompanyProductStatus = useAppStore((state) => state.setCompanyProductStatus);
  const addCompanyProduct = useAppStore((state) => state.addCompanyProduct);
  const addToast = useAppStore((state) => state.addToast);
  const tripItems = useAppStore((state) => state.tripItems);
  const tripCompletions = useAppStore((state) => state.tripCompletions);

  const { companyMap, siteMap, productMap } = useEntityMaps();

  type EditorState = {
    companyId: string;
    siteId: string;
    productId: string;
    productCode: string;
    certificateNo: string;
    certificateDate: string;
    lastSampleDate: string;
    paymentStatus: PaymentStatus | "";
  };

  const emptyEditorState: EditorState = {
    companyId: "",
    siteId: "",
    productId: "",
    productCode: "",
    certificateNo: "",
    certificateDate: "",
    lastSampleDate: "",
    paymentStatus: "yapmadi"
  };

  const [searchTerm, setSearchTerm] = useState("");
  const [selected, setSelected] = useState<CompanyProduct | null>(null);
  const [editorState, setEditorState] = useState<EditorState>(emptyEditorState);
  const [modalOpen, setModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const filtered = useMemo(() => {
    if (!searchTerm) return companyProducts;
    const query = searchTerm.toLowerCase();
    return companyProducts.filter((cp) => {
      const company = companyMap.get(cp.companyId);
      const product = productMap.get(cp.productId);
      const site = cp.siteId ? siteMap.get(cp.siteId) : undefined;
      const matchesCompany = company?.name.toLowerCase().includes(query) ?? false;
      const matchesCompanyCode = company?.customerCode?.toLowerCase().includes(query) ?? false;
      const matchesProduct = product?.name.toLowerCase().includes(query) ?? false;
      const matchesProductCode = cp.productCode?.toLowerCase().includes(query) ?? false;
      const matchesStandard = product?.standardNo?.toLowerCase().includes(query) ?? false;
      const matchesCertificate = cp.certificateNo?.toLowerCase().includes(query) ?? false;
      const matchesCity = site?.city?.toLowerCase().includes(query) ?? false;
      const matchesDistrict = site?.district?.toLowerCase().includes(query) ?? false;
      return (
        matchesCompany ||
        matchesCompanyCode ||
        matchesProduct ||
        matchesProductCode ||
        matchesStandard ||
        matchesCertificate ||
        matchesCity ||
        matchesDistrict
      );
    });
  }, [companyProducts, searchTerm, companyMap, productMap, siteMap]);

  const currentYear = new Date().getFullYear();
  const sampleCounts = useMemo(
    () => buildAnnualSampleCounts(tripItems, tripCompletions, currentYear),
    [tripItems, tripCompletions, currentYear]
  );

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

  const handleStatusChange = (companyProduct: CompanyProduct, status: CompanyProductStatus) => {
    if (companyProduct.status === status) return;

    setCompanyProductStatus(companyProduct.id, status);
    addToast({ title: "Firma-ürün durumu güncellendi", variant: "success" });
  };

  const columns: TableColumn<CompanyProduct>[] = [
    {
      id: "productCode",
      header: "Ürün Kodu",
      cell: (row) => row.productCode ?? "-"
    },
    {
      id: "btCode",
      header: "BT Kod",
      cell: (row) => companyMap.get(row.companyId)?.customerCode ?? "-"
    },
    {
      id: "company",
      header: "Firma Adı",
      cell: (row) => companyMap.get(row.companyId)?.name ?? "-"
    },
    {
      id: "location",
      header: "İl / İlçe",
      cell: (row) => {
        const site = row.siteId ? siteMap.get(row.siteId) : undefined;
        if (!site) return "-";
        return site.district ? `${site.city} / ${site.district}` : site.city;
      }
    },
    {
      id: "lastSample",
      header: "Son Numune Tarihi",
      cell: (row) => formatDate(row.lastSampleDate)
    },
    {
      id: "sampleCount",
      header: "Numune Sayısı",
      cell: (row) => {
        const product = productMap.get(row.productId);
        if (!product) return "-";
        const count = sampleCounts.get(row.id) ?? 0;
        const quota = getRequiredSampleCount(product.productType);
        return `${count}/${quota}`;
      }
    },
    {
      id: "paymentStatus",
      header: "Ödeme Durumu",
      cell: (row) => {
        const status = row.paymentStatus;
        if (!status) return "-";
        const label = paymentStatusLabels[status];
        const token = paymentStatusTokens[status];
        if (!label || !token) return label ?? "-";
        return <Badge className={token}>{label}</Badge>;
      }
    },
    {
      id: "certificateDate",
      header: "Belge Tarihi",
      cell: (row) => formatDate(row.certificateDate)
    },
    {
      id: "standard",
      header: "Standart",
      cell: (row) => productMap.get(row.productId)?.standardNo ?? "-"
    },
    {
      id: "product",
      header: "Ürün Adı",
      cell: (row) => productMap.get(row.productId)?.name ?? "-"
    },
    {
      id: "status",
      header: "Durum",
      cell: (row) => {
        const product = productMap.get(row.productId);
        const currentStatus = (row.status ?? "devam") as CompanyProductStatus;
        const options = product?.productType === "concrete" ? ["devam", "iptal"] : ["devam", "kesikli", "aski", "iptal"];

        return (
          <select
            value={currentStatus}
            onChange={(event) => handleStatusChange(row, event.target.value as CompanyProductStatus)}
            className={`rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold ${statusClassMap[currentStatus]}`}
          >
            {options.map((option) => (
              <option key={option} value={option}>
                {statusLabels[option as CompanyProductStatus]}
              </option>
            ))}
          </select>
        );
      }
    },
    {
      id: "actions",
      header: "İşlemler",
      cell: (row) => (
        <Button size="sm" variant="ghost" icon={<Edit3 className="h-4 w-4" />} onClick={() => openEditor(row)}>
          
        </Button>
      )
    }
  ];

  const openEditor = (cp: CompanyProduct) => {
    setIsCreating(false);
    setSelected(cp);
    setEditorState({
      companyId: cp.companyId ? String(cp.companyId) : "",
      siteId: cp.siteId ? String(cp.siteId) : "",
      productId: cp.productId ? String(cp.productId) : "",
      productCode: cp.productCode ?? "",
      certificateNo: cp.certificateNo ?? "",
      certificateDate: cp.certificateDate ? cp.certificateDate.slice(0, 10) : "",
      lastSampleDate: cp.lastSampleDate ? cp.lastSampleDate.slice(0, 10) : "",
      paymentStatus: (cp.paymentStatus ?? "yapmadi") as PaymentStatus
    });
    setModalOpen(true);
  };

  const openNewRecord = () => {
    setIsCreating(true);
    setSelected(null);
    setEditorState(emptyEditorState);
    setModalOpen(true);
  };


  const updateEditorField = (field: keyof EditorState, value: string) => {
    setEditorState((prev) => {
      const next = { ...prev, [field]: value } as EditorState;
      if (field === "companyId") {
        next.siteId = "";
      }
      return next;
    });
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelected(null);
    setEditorState(emptyEditorState);
    setIsCreating(false);
  };

  const saveEdits = () => {
    const companyId = editorState.companyId ? Number(editorState.companyId) : selected?.companyId;
    const productId = editorState.productId ? Number(editorState.productId) : selected?.productId;
    const siteId = editorState.siteId ? Number(editorState.siteId) : selected?.siteId;
    const paymentStatus = editorState.paymentStatus || undefined;

    if (!companyId || !productId) {
      addToast({
        title: "Zorunlu alanlar eksik",
        description: "Firma ve Ürün seçimleri yapılmalıdır.",
        variant: "error"
      });
      return;
    }

    const payload = {
      companyId,
      productId,
      siteId,
      productCode: editorState.productCode || undefined,
      certificateNo: editorState.certificateNo || undefined,
      certificateDate: editorState.certificateDate || undefined,
      lastSampleDate: editorState.lastSampleDate || undefined,
      paymentStatus: paymentStatus as PaymentStatus | undefined
    };

    if (isCreating) {
      addCompanyProduct(payload);
      addToast({ title: "Firma-Ürün kaydı oluşturuldu", variant: "success" });
    } else if (selected) {
      updateCompanyProduct({
        id: selected.id,
        ...payload
      });
      addToast({ title: "Firma-ürün kaydı güncellendi", variant: "success" });
    }

    closeModal();
  };

  const activeCompanyId = editorState.companyId ? Number(editorState.companyId) : selected?.companyId;
  const availableSites = useMemo(
    () => (activeCompanyId ? sites.filter((site) => site.companyId === activeCompanyId) : sites),
    [sites, activeCompanyId]
  );

  const editorProduct = editorState.productId
    ? productMap.get(Number(editorState.productId))
    : selected
    ? productMap.get(selected.productId)
    : undefined;

  const editorCompany = activeCompanyId ? companyMap.get(activeCompanyId) : undefined;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Firma-Ürünler</h1>
          <p className="text-sm text-slate-500">Numune planlamasında kullanılan firma ve ürün eşleşmeleri</p>
        </div>
        <Button variant="ghost" onClick={openNewRecord}>
          Yeni Kayıt
        </Button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <input
          className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          placeholder="BT kodu, firma, ürün veya laboratuvar ara"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
        <Table columns={columns} data={filtered} keyExtractor={(row) => row.id} emptyState="Eşleşen kayıt bulunamadı" />
      </div>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title="Firma-Ürün Kaydı Düzenle"
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={closeModal}>
              Vazgeç
            </Button>
            <Button onClick={saveEdits} disabled={!isCreating && !selected}>
              Kaydet
            </Button>
          </div>
        }
      >
        {(selected || isCreating) ? (
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Firma
              <select
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={editorState.companyId}
                onChange={(event) => updateEditorField("companyId", event.target.value)}
              >
                <option value="">Firma seçin</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.customerCode ? `${company.customerCode} - ${company.name}` : company.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              İl / İlçe (Saha)
              <select
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={editorState.siteId}
                onChange={(event) => updateEditorField("siteId", event.target.value)}
              >
                <option value="">Genel</option>
                {availableSites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.city}
                    {site.district ? ` / ${site.district}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Ürün
              <select
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={editorState.productId}
                onChange={(event) => updateEditorField("productId", event.target.value)}
              >
                <option value="">Ürün seçin</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                    {product.standardNo ? ` / ${product.standardNo}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Ürün Kodu
              <input
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={editorState.productCode}
                onChange={(event) => updateEditorField("productCode", event.target.value)}
                placeholder="örn. CPC-2230.Ş4"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Sertifika No
              <input
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={editorState.certificateNo}
                onChange={(event) => updateEditorField("certificateNo", event.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Belge Tarihi
              <input
                type="date"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={editorState.certificateDate}
                onChange={(event) => updateEditorField("certificateDate", event.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Son Numune Tarihi
              <input
                type="date"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={editorState.lastSampleDate}
                onChange={(event) => updateEditorField("lastSampleDate", event.target.value)}
              />
            </label>
            <div className="md:col-span-2 space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
              <p>
                <strong>BT Kodu:</strong> {editorCompany?.customerCode ?? "-"}
              </p>
              <p>
                <strong>Standart:</strong> {editorProduct?.standardNo ?? "-"}
              </p>
              <p>
                <strong>Ürün Adı:</strong> {editorProduct?.name ?? "-"}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">Düzenlenecek kayıt seçilmedi.</p>
        )}
      </Modal>
    </div>
  );
};

export default CompanyProductList;













