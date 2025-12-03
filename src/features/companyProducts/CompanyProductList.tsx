import { useEffect, useMemo, useState } from "react";
import { Edit3, Trash2 } from "lucide-react";

import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Modal from "../../components/ui/Modal";
import Table from "../../components/ui/Table";
import { useAppStore } from "../../state/useAppStore";
import { formatDate } from "../../utils/date";
import { paymentStatusLabels, paymentStatusTokens, getProductTypeLabel, productTypeLabels } from "../../utils/labels";
import { buildSampleCounts, getAnnualRequiredSampleCount } from "../../utils/samples";
import type { TableColumn } from "../../components/ui/Table";
import type { CompanyProductRecord, CompanyProductStatus, PaymentStatus, Product, ProductType } from "../../types";

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

const buildRecordKey = (record: CompanyProductRecord) =>
  `${record.companyName}__${record.productId ?? record.productType}__${record.productCode ?? record.standard ?? ""}`;

type EditorState = {
  productType: ProductType | "";
  companyName: string;
  productName: string;
  productCode: string;
  btCode: string;
  code: string;
  location: string;
  certificateDate: string;
  lastSampleDate: string;
  lastInspectionDate: string;
  paymentStatus: PaymentStatus | "";
  standard: string;
  status: CompanyProductStatus;
  productId: number | null;
  requiresSampling: boolean;
  samplingIntervalMonths: string;
  labReturnDays: string;
};

const emptyEditorState: EditorState = {
  productType: "",
  companyName: "",
  productName: "",
  productCode: "",
  btCode: "",
  code: "",
  location: "",
  certificateDate: "",
  lastSampleDate: "",
  lastInspectionDate: "",
  paymentStatus: "yapmadi",
  standard: "",
  status: "devam",
  productId: null,
  requiresSampling: false,
  samplingIntervalMonths: "",
  labReturnDays: ""
};

const CompanyProductList = () => {
  const records = useAppStore((state) => state.companyProductRecords);
  const products = useAppStore((state) => state.products);
  const loadTrips = useAppStore((state) => state.loadTrips);
  const tripItems = useAppStore((state) => state.tripItems);
  const loadProducts = useAppStore((state) => state.loadProducts);
  const loadCompanyProductRecords = useAppStore((state) => state.loadCompanyProductRecords);
  const addRecord = useAppStore((state) => state.addCompanyProductRecord);
  const updateRecord = useAppStore((state) => state.updateCompanyProductRecord);
  const deleteRecord = useAppStore((state) => state.deleteCompanyProductRecord);
  const addToast = useAppStore((state) => state.addToast);

  const [searchTerm, setSearchTerm] = useState("");
  const [editorState, setEditorState] = useState<EditorState>(emptyEditorState);
  const [modalOpen, setModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [selectedRecordId, setSelectedRecordId] = useState<number | null>(null);

  useEffect(() => {
    loadProducts();
    loadCompanyProductRecords();
    loadTrips();
  }, [loadProducts, loadCompanyProductRecords, loadTrips]);

  const filtered = useMemo(() => {
    if (!searchTerm) return records;
    const query = searchTerm.toLowerCase();
    return records.filter((record) => {
      const haystack = [
        getProductTypeLabel(record.productType),
        record.productCode,
        record.btCode,
        record.code,
        record.companyName,
        record.location,
        record.standard,
        record.productName
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [records, searchTerm]);

  const productTypeOptions = useMemo(() => {
    const types = new Set<ProductType>();
    products.forEach((product) => types.add(product.productType));
    records.forEach((record) => types.add(record.productType));
    if (types.size === 0) {
      Object.keys(productTypeLabels).forEach((type) => types.add(type));
    }
    return Array.from(types).sort((a, b) => getProductTypeLabel(a).localeCompare(getProductTypeLabel(b), "tr"));
  }, [products, records]);

  const buildEmptyEditorState = () => ({
    ...emptyEditorState,
    productType: productTypeOptions[0] ?? ""
  });

  const filteredProductsByType = useMemo(() => {
    if (!editorState.productType) return products;
    return products.filter((product) => product.productType === editorState.productType);
  }, [products, editorState.productType]);

  const productNameOptions = useMemo(() => {
    const names = new Set<string>();
    filteredProductsByType.forEach((product) => {
      if (product.name) names.add(product.name);
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b, "tr"));
  }, [filteredProductsByType]);

  const standardOptions = useMemo(() => {
    const standards = new Set<string>();
    const source = editorState.productName
      ? filteredProductsByType.filter((p) => p.name === editorState.productName)
      : filteredProductsByType;
    source.forEach((product) => {
      if (product.standardNo) standards.add(product.standardNo);
    });
    return Array.from(standards).sort((a, b) => a.localeCompare(b, "tr"));
  }, [filteredProductsByType, editorState.productName]);

  const requiresOptions = useMemo(() => {
    const options = new Set<string>();
    filteredProductsByType.forEach((product) => {
      if (product.requiresSampling === true) options.add("yes");
      if (product.requiresSampling === false) options.add("no");
    });
    return Array.from(options);
  }, [filteredProductsByType]);

  const selectProduct = (product: Product | undefined) => {
    if (!product) return;
    setEditorState((prev) => ({
      ...prev,
      productId: product.id,
      productType: product.productType,
      productName: product.name,
      standard: product.standardNo ?? "",
      requiresSampling: product.requiresSampling ?? false,
      samplingIntervalMonths:
        product.requiresSampling && product.samplingIntervalMonths ? String(product.samplingIntervalMonths) : "",
      labReturnDays: product.labReturnDays ? String(product.labReturnDays) : ""
    }));
  };

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const currentYear = new Date().getFullYear();
  const sampleCounts = useMemo(() => buildSampleCounts(tripItems, currentYear), [tripItems, currentYear]);

  const columns: TableColumn<CompanyProductRecord>[] = [
    {
      id: "productType",
      header: "Ürün Tipi",
      cell: (row) => getProductTypeLabel(row.productType)
    },
    {
      id: "productCode",
      header: "Ürün Kodu",
      cell: (row) => row.productCode ?? "-"
    },
    {
      id: "btCode",
      header: "BT Kod",
      cell: (row) => row.btCode ?? "-"
    },
    {
      id: "code",
      header: "Kod",
      cell: (row) => row.code ?? "-"
    },
    {
      id: "company",
      header: "Firma Adı",
      cell: (row) => row.companyName
    },
    {
      id: "location",
      header: "İl / İlçe",
      cell: (row) => row.location ?? "-"
    },
    {
      id: "lastSample",
      header: "Son Numune Tarihi",
      cell: (row) => formatDate(row.lastSampleDate)
    },
    {
      id: "lastInspection",
      header: "Son Denetim Tarihi",
      cell: (row) => formatDate(row.lastInspectionDate)
    },
    {
      id: "sampleCount",
      header: "Numune Sayısı",
      cell: (row) => {
        if (!row.id) return "-";
        const product = row.productId ? productMap.get(row.productId) : undefined;
        const required = getAnnualRequiredSampleCount(row, product, row.status ?? "devam");
        if (required === 0) return "-";
        const taken = sampleCounts.get(row.id) ?? 0;
        return `${taken}/${required}`;
      }
    },
    {
      id: "paymentStatus",
      header: "Ödeme Durumu",
      cell: (row) => {
        if (!row.paymentStatus) return "-";
        return <Badge className={paymentStatusTokens[row.paymentStatus]}>{paymentStatusLabels[row.paymentStatus]}</Badge>;
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
      cell: (row) => row.standard ?? "-"
    },
    {
      id: "productName",
      header: "Ürün Adı",
      cell: (row) => row.productName ?? "-"
    },
    {
      id: "status",
      header: "Durum",
      cell: (row) => (
        <Badge className={`px-3 py-1 text-xs font-semibold ${statusClassMap[row.status ?? "devam"]}`}>
          {statusLabels[row.status ?? "devam"]}
        </Badge>
      )
    },
    {
      id: "actions",
      header: "İşlemler",
      width: "110px",
      align: "center",
      cell: (row) => (
        <div className="flex items-center justify-center gap-1">
          <Button size="sm" variant="ghost" icon={<Edit3 className="h-4 w-4" />} onClick={() => openEditor(row)} />
          <Button
            size="sm"
            variant="ghost"
            icon={<Trash2 className="h-4 w-4" />}
            onClick={() => handleDeleteRecord(row)}
          />
        </div>
      )
    }
  ];

  const openEditor = (record: CompanyProductRecord) => {
    setIsCreating(false);
    setSelectedKey(buildRecordKey(record));
    setSelectedRecordId(record.id ?? null);
    setEditorState({
      productType: record.productType,
      companyName: record.companyName,
      productName: record.productName,
      productCode: record.productCode ?? "",
      btCode: record.btCode ?? "",
      code: record.code ?? "",
      location: record.location ?? "",
      certificateDate: record.certificateDate ? record.certificateDate.slice(0, 10) : "",
      lastSampleDate: record.lastSampleDate ? record.lastSampleDate.slice(0, 10) : "",
      lastInspectionDate: record.lastInspectionDate ? record.lastInspectionDate.slice(0, 10) : "",
      paymentStatus: (record.paymentStatus ?? "yapmadi") as PaymentStatus,
      standard: record.standard ?? "",
      status: record.status ?? "devam",
      productId: record.productId ?? null,
      requiresSampling: record.requiresSampling ?? false,
      samplingIntervalMonths: record.samplingIntervalMonths ? String(record.samplingIntervalMonths) : "",
      labReturnDays: record.labReturnDays ? String(record.labReturnDays) : ""
    });
    setModalOpen(true);
  };

  const openNewRecord = () => {
    setIsCreating(true);
    setSelectedKey(null);
    setSelectedRecordId(null);
    setEditorState(buildEmptyEditorState());
    setModalOpen(true);
  };

  const handleDeleteRecord = (record: CompanyProductRecord) => {
    const key = buildRecordKey(record);
    if (!window.confirm("Bu firma-ürün kaydını silmek istediğinize emin misiniz?")) return;
    deleteRecord(key, record.id);
    addToast({ title: "Firma-ürün kaydı silindi", variant: "success" });
  };

  const updateEditorField = <K extends keyof EditorState>(field: K, value: EditorState[K]) => {
    setEditorState((prev) => ({ ...prev, [field]: value }));
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedKey(null);
    setSelectedRecordId(null);
    setEditorState(buildEmptyEditorState());
    setIsCreating(false);
  };

  const saveEdits = async () => {
    const samplingInterval =
      editorState.requiresSampling && editorState.samplingIntervalMonths.trim()
        ? Number(editorState.samplingIntervalMonths)
        : undefined;
    const labReturnDays = editorState.labReturnDays.trim() ? Number(editorState.labReturnDays) : undefined;

    if (editorState.requiresSampling && (!samplingInterval || samplingInterval <= 0)) {
      addToast({ title: "Numune döngüsü geçerli bir değer olmalı", variant: "error" });
      return;
    }

    if (labReturnDays !== undefined && (Number.isNaN(labReturnDays) || labReturnDays < 0)) {
      addToast({ title: "Laboratuvar dönüş günü geçerli olmalı", variant: "error" });
      return;
    }

    const payload: CompanyProductRecord = {
      productType: (editorState.productType || "concrete") as ProductType,
      companyName: editorState.companyName.trim(),
      productName: editorState.productName.trim() || "Ürün",
      productCode: editorState.productCode || undefined,
      btCode: editorState.btCode || undefined,
      code: editorState.code || undefined,
      location: editorState.location || undefined,
      certificateDate: editorState.certificateDate || undefined,
      lastSampleDate: editorState.lastSampleDate || undefined,
      lastInspectionDate: editorState.lastInspectionDate || undefined,
      paymentStatus: editorState.paymentStatus || undefined,
      standard: editorState.standard || undefined,
      status: editorState.status ?? "devam",
      productId: editorState.productId ?? undefined,
      requiresSampling: editorState.requiresSampling,
      samplingIntervalMonths: samplingInterval,
      labReturnDays
    };

    if (!payload.productType) {
      addToast({ title: "Ürün tipi zorunlu", variant: "error" });
      return;
    }

    if (!payload.companyName) {
      addToast({ title: "Firma adı zorunlu", variant: "error" });
      return;
    }

    if (isCreating) {
      await addRecord(payload);
      addToast({ title: "Firma-ürün kaydı oluşturuldu", variant: "success" });
    } else if (selectedKey) {
      await updateRecord(selectedKey, { ...payload, id: selectedRecordId ?? undefined });
      addToast({ title: "Firma-ürün kaydı güncellendi", variant: "success" });
    }

    closeModal();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Firma-Ürünler</h1>
          <p className="text-sm text-slate-500">Ürün tipi bazlı yeni tablo yapısını önizleyin ve düzenleyin</p>
        </div>
        <Button variant="ghost" onClick={openNewRecord}>
          Yeni Kayıt
        </Button>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <input
          className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          placeholder="BT kodu, firma, ürün veya standart ara"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
        <Table
          columns={columns}
          data={filtered}
          keyExtractor={(row) => buildRecordKey(row)}
          emptyState="Eşleşen kayıt bulunamadı"
          containerClassName="scrollbar-thin"
          tableClassName="min-w-[1200px]"
        />
      </div>
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title="Firma-Ürün Kaydı"
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={closeModal}>
              Vazgeç
            </Button>
            <Button onClick={saveEdits} disabled={!isCreating && !selectedKey}>
              Kaydet
            </Button>
          </div>
        }
      >
        {isCreating || selectedKey ? (
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Ürün Tipi
              <select
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={editorState.productType}
                onChange={(event) => {
                  updateEditorField("productType", event.target.value as ProductType);
                  updateEditorField("productId", null);
                  updateEditorField("productName", "");
                  updateEditorField("standard", "");
                  updateEditorField("samplingIntervalMonths", "");
                  updateEditorField("labReturnDays", "");
                }}
              >
                <option value="">Ürün tipini seçin</option>
                {productTypeOptions.map((type) => (
                  <option key={type} value={type}>
                    {getProductTypeLabel(type)}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Ürün Adı
              <select
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={editorState.productName}
                onChange={(event) => {
                  const name = event.target.value;
                  updateEditorField("productName", name);
                  const match = filteredProductsByType.find((p) => p.name === name);
                  selectProduct(match);
                }}
              >
                <option value="">Ürün adı seçin</option>
                {productNameOptions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Firma Adı
              <input
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={editorState.companyName}
                onChange={(event) => updateEditorField("companyName", event.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              BT Kod
              <input
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={editorState.btCode}
                onChange={(event) => updateEditorField("btCode", event.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Kod
              <input
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={editorState.code}
                onChange={(event) => updateEditorField("code", event.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Ürün Kodu
              <input
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={editorState.productCode}
                onChange={(event) => updateEditorField("productCode", event.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              İl / İlçe
              <input
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={editorState.location}
                onChange={(event) => updateEditorField("location", event.target.value)}
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
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Son Denetim Tarihi
              <input
                type="date"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={editorState.lastInspectionDate}
                onChange={(event) => updateEditorField("lastInspectionDate", event.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Ödeme Durumu
              <select
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={editorState.paymentStatus}
                onChange={(event) => updateEditorField("paymentStatus", event.target.value as PaymentStatus | "")}
              >
                <option value="">Belirtilmedi</option>
                {(Object.keys(paymentStatusLabels) as PaymentStatus[]).map((status) => (
                  <option key={status} value={status}>
                    {paymentStatusLabels[status]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Numune Alınacak mı
              <select
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={editorState.requiresSampling ? "yes" : "no"}
                onChange={(event) => {
                  const value = event.target.value === "yes";
                  updateEditorField("requiresSampling", value);
                  if (!value) {
                    updateEditorField("samplingIntervalMonths", "");
                  }
                }}
              >
                {(requiresOptions.length > 0 ? requiresOptions : ["yes", "no"]).map((opt) => (
                  <option key={opt} value={opt}>
                    {opt === "yes" ? "Evet" : "Hayır"}
                  </option>
                ))}
              </select>
            </label>
            {editorState.requiresSampling ? (
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                Numune Döngüsü (Ay)
                <input
                  type="number"
                  min="1"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={editorState.samplingIntervalMonths}
                  onChange={(event) => updateEditorField("samplingIntervalMonths", event.target.value)}
                />
              </label>
            ) : null}
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Laboratuvar Dönüş Tahmini (Gün)
              <input
                type="number"
                min="0"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={editorState.labReturnDays}
                onChange={(event) => updateEditorField("labReturnDays", event.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Standart
              <select
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={editorState.standard}
                onChange={(event) => {
                  const standard = event.target.value;
                  updateEditorField("standard", standard);
                  const match = filteredProductsByType.find(
                    (p) =>
                      p.standardNo === standard &&
                      (editorState.productName ? p.name === editorState.productName : true)
                  );
                  if (match) selectProduct(match);
                }}
              >
                <option value="">Standart seçin</option>
                {standardOptions.map((standard) => (
                  <option key={standard} value={standard}>
                    {standard}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Durum
              <select
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={editorState.status}
                onChange={(event) => updateEditorField("status", event.target.value as CompanyProductStatus)}
              >
                <option value="devam">Devam</option>
                <option value="kesikli">Kesikli</option>
                <option value="aski">Askı</option>
                <option value="iptal">İptal</option>
              </select>
            </label>
          </div>
        ) : (
          <p className="text-sm text-slate-500">Düzenlenecek kayıt seçilmedi.</p>
        )}
      </Modal>
    </div>
  );
};

export default CompanyProductList;
