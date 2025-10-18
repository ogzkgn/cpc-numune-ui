import { useMemo, useState } from "react";
import { Archive, ArchiveRestore, Edit3 } from "lucide-react";

import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Modal from "../../components/ui/Modal";
import Table from "../../components/ui/Table";
import { useAppStore } from "../../state/useAppStore";
import { useEntityMaps } from "../../hooks/useEntityMaps";
import { formatDate } from "../../utils/date";
import { buildAnnualSampleCounts, getRequiredSampleCount } from "../../utils/samples";
import type { TableColumn } from "../../components/ui/Table";
import type { CompanyProduct } from "../../types";

const CompanyProductList = () => {
  const companyProducts = useAppStore((state) => state.companyProducts);
  const companies = useAppStore((state) => state.companies);
  const sites = useAppStore((state) => state.sites);
  const products = useAppStore((state) => state.products);
  const updateCompanyProduct = useAppStore((state) => state.updateCompanyProduct);
  const setCompanyProductArchived = useAppStore((state) => state.setCompanyProductArchived);
  const addToast = useAppStore((state) => state.addToast);
  const tripItems = useAppStore((state) => state.tripItems);
  const tripCompletions = useAppStore((state) => state.tripCompletions);

  const { companyMap, siteMap, productMap } = useEntityMaps();

  type EditorState = {
    companyId: string;
    siteId: string;
    productId: string;
    productCode: string;
    labName: string;
    certificateNo: string;
    certificateDate: string;
    lastSampleDate: string;
  };

  const emptyEditorState: EditorState = {
    companyId: "",
    siteId: "",
    productId: "",
    productCode: "",
    labName: "",
    certificateNo: "",
    certificateDate: "",
    lastSampleDate: ""
  };

  const [searchTerm, setSearchTerm] = useState("");
  const [selected, setSelected] = useState<CompanyProduct | null>(null);
  const [editorState, setEditorState] = useState<EditorState>(emptyEditorState);
  const [modalOpen, setModalOpen] = useState(false);

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
      const matchesLab = cp.labName?.toLowerCase().includes(query) ?? false;
      const matchesCertificate = cp.certificateNo?.toLowerCase().includes(query) ?? false;
      const matchesCity = site?.city?.toLowerCase().includes(query) ?? false;
      const matchesDistrict = site?.district?.toLowerCase().includes(query) ?? false;
      return (
        matchesCompany ||
        matchesCompanyCode ||
        matchesProduct ||
        matchesProductCode ||
        matchesStandard ||
        matchesLab ||
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

  const columns: TableColumn<CompanyProduct>[] = [
    
    {
      id: "productCode",
      header: "Ürün Kodu",
      cell: (row) => row.productCode ?? "-"
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
      id: "labName",
      header: "Laboratuvar",
      cell: (row) => row.labName ?? "-"
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
      cell: (row) => (
        <Badge variant={row.status === "archived" ? "danger" : "success"}>
          {row.status === "archived" ? "İptal" : "Devam"}
        </Badge>
      )
    },
    {
      id: "actions",
      header: "İşlemler",
      cell: (row) => (
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" icon={<Edit3 className="h-4 w-4" />} onClick={() => openEditor(row)}>
            
          </Button>
          {row.status === "archived" ? (
            <Button
              size="sm"
              variant="ghost"
              icon={<ArchiveRestore className="h-4 w-4" />}
              onClick={() => toggleArchive(row, false)}
            >
              
            </Button>
          ) : (
            <Button size="sm" variant="ghost" icon={<Archive className="h-4 w-4" />} onClick={() => toggleArchive(row, true)}>
              
            </Button>
          )}
        </div>
      )
    }
  ];

  const openEditor = (cp: CompanyProduct) => {
    setSelected(cp);
    setEditorState({
      companyId: cp.companyId ? String(cp.companyId) : "",
      siteId: cp.siteId ? String(cp.siteId) : "",
      productId: cp.productId ? String(cp.productId) : "",
      productCode: cp.productCode ?? "",
      labName: cp.labName ?? "",
      certificateNo: cp.certificateNo ?? "",
      certificateDate: cp.certificateDate ? cp.certificateDate.slice(0, 10) : "",
      lastSampleDate: cp.lastSampleDate ? cp.lastSampleDate.slice(0, 10) : ""
    });
    setModalOpen(true);
  };

  const toggleArchive = (cp: CompanyProduct, archived: boolean) => {
    setCompanyProductArchived(cp.id, archived);
    addToast({ title: archived ? "Kayit arsive alindi" : "Kayit aktiflesti", variant: "info" });
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
  };

  const saveEdits = () => {
    if (!selected) return;

    const companyId = editorState.companyId ? Number(editorState.companyId) : selected.companyId;
    const productId = editorState.productId ? Number(editorState.productId) : selected.productId;
    const siteId = editorState.siteId ? Number(editorState.siteId) : undefined;

    updateCompanyProduct({
      id: selected.id,
      companyId,
      productId,
      siteId,
      productCode: editorState.productCode || undefined,
      labName: editorState.labName || undefined,
      certificateNo: editorState.certificateNo || undefined,
      certificateDate: editorState.certificateDate || undefined,
      lastSampleDate: editorState.lastSampleDate || undefined
    });

    addToast({ title: "Firma-Urun kaydi guncellendi", variant: "success" });
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
        <Button variant="ghost" onClick={() => addToast({ title: "Yeni kayıt formu prototipte öngörülüyor", variant: "info" })}>
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
            <Button onClick={saveEdits} disabled={!selected}>
              Kaydet
            </Button>
          </div>
        }
      >
        {selected ? (
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
                placeholder="Örn. CPC-2230.Ç4"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Laboratuvar İsmi
              <input
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={editorState.labName}
                onChange={(event) => updateEditorField("labName", event.target.value)}
                placeholder="Örn. Bursa Çimento Lab."
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
