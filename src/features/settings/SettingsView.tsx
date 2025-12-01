import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Edit3, Trash2} from "lucide-react";

import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Chip from "../../components/ui/Chip";
import Table from "../../components/ui/Table";
import { useAppStore } from "../../state/useAppStore";
import { employeeStatusLabels, employeeStatusTokens, getProductTypeLabel, productTypeLabels } from "../../utils/labels";
import type { TableColumn } from "../../components/ui/Table";
import type { Employee, Product, ProductType } from "../../types";

const SettingsView = () => {
  const employees = useAppStore((state) => state.employees);
  const samplingCycles = useAppStore((state) => state.samplingCycles);
  const products = useAppStore((state) => state.products);
  const loadProducts = useAppStore((state) => state.loadProducts);
  const loadEmployees = useAppStore((state) => state.loadEmployees);
  const addProduct = useAppStore((state) => state.addProduct);
  const deleteProduct = useAppStore((state) => state.deleteProduct);
  const addEmployee = useAppStore((state) => state.addEmployee);
  const updateEmployee = useAppStore((state) => state.updateEmployee);
  const deleteEmployee = useAppStore((state) => state.deleteEmployee);
  const addToast = useAppStore((state) => state.addToast);

  useEffect(() => {
    loadProducts();
    loadEmployees();
  }, [loadProducts, loadEmployees]);

  const employeeColumns: TableColumn<Employee>[] = [
    { id: "name", header: "Ad", cell: (row) => row.name },
    { id: "city", header: "Şehir", cell: (row) => row.city ?? "-" },
    { id: "skills", header: "Yetenek", cell: (row) => row.skills.map((skill) => getProductTypeLabel(skill)).join(", ") },
    {
      id: "status",
      header: "Durum",
      cell: (row) => <Badge className={employeeStatusTokens[row.status]}>{employeeStatusLabels[row.status]}</Badge>
    },
    {
      id: "actions",
      header: "İşlemler",
      width: "120px",
      align: "center",
      cell: (row) => (
        <div className="flex items-center justify-center gap-1">
          <Button size="sm" variant="ghost" icon={<Edit3 className="h-4 w-4" />} onClick={() => handleEditEmployee(row)} />
          <Button
            size="sm"
            variant="ghost"
            icon={<Trash2 className="h-4 w-4" />}
            onClick={() => handleDeleteEmployee(row)}
          />
        </div>
      )
    }
  ];

  const productColumns: TableColumn<Product>[] = [
    { id: "name", header: "Ürün Adı", cell: (row) => row.name },
    { id: "type", header: "Ürün Tipi", cell: (row) => getProductTypeLabel(row.productType) },
    {
      id: "sampling",
      header: "Numune Alınacak mı",
      cell: (row) => {
        if (row.requiresSampling === undefined) return "-";
        return row.requiresSampling ? "Evet" : "Hayır";
      }
    },
    {
      id: "samplingCycle",
      header: "Döngü (Ay)",
      cell: (row) => (row.requiresSampling ? row.samplingIntervalMonths ?? "-" : "-")
    },
    {
      id: "labReturn",
      header: "Lab Dönüş (Gün)",
      cell: (row) => row.labReturnDays ?? "-"
    },
    { id: "standard", header: "Standart", cell: (row) => row.standardNo ?? "-" },
    {
      id: "actions",
      header: "İşlemler",
      width: "100px",
      align: "center",
      cell: (row) => (
        <Button
          size="sm"
          variant="ghost"
          icon={<Trash2 className="h-4 w-4" />}
          onClick={() => handleDeleteProduct(row)}
        />
      )
    }
  ];

  type ProductFormState = {
    name: string;
    productTypeSelection: string;
    customProductType: string;
    requiresSampling: "yes" | "no";
    samplingIntervalMonths: string;
    labReturnDays: string;
    standardNo: string;
  };

  const DEFAULT_PRODUCT_TYPE = (Object.keys(productTypeLabels)[0] as ProductType) ?? "";

  const [productForm, setProductForm] = useState<ProductFormState>({
    name: "",
    productTypeSelection: DEFAULT_PRODUCT_TYPE,
    customProductType: "",
    requiresSampling: "yes",
    samplingIntervalMonths: "",
    labReturnDays: "",
    standardNo: ""
  });

  type EmployeeFormState = {
    id: number | null;
    name: string;
    city: string;
    status: Employee["status"];
    skills: ProductType[];
  };

  const [employeeForm, setEmployeeForm] = useState<EmployeeFormState>({
    id: null,
    name: "",
    city: "",
    status: "available",
    skills: []
  });

  const sortedProducts = useMemo(
    () => [...products].sort((a, b) => a.name.localeCompare(b.name, "tr")),
    [products]
  );

  const productTypeOptions = useMemo(() => {
    const types = new Set<ProductType>();
    if (DEFAULT_PRODUCT_TYPE) {
      types.add(DEFAULT_PRODUCT_TYPE);
    }
    Object.keys(productTypeLabels).forEach((type) => types.add(type as ProductType));
    products.forEach((product) => {
      if (product.productType) {
        types.add(product.productType);
      }
    });
    return Array.from(types).sort((a, b) => getProductTypeLabel(a).localeCompare(getProductTypeLabel(b), "tr"));
  }, [products]);

  const handleProductFormChange = <K extends keyof ProductFormState>(field: K, value: ProductFormState[K]) => {
    setProductForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleEmployeeFormChange = <K extends keyof EmployeeFormState>(field: K, value: EmployeeFormState[K]) => {
    setEmployeeForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleEmployeeSkill = (skill: ProductType) => {
    setEmployeeForm((prev) => {
      const skills = new Set(prev.skills);
      if (skills.has(skill)) {
        skills.delete(skill);
      } else {
        skills.add(skill);
      }
      return { ...prev, skills: Array.from(skills) };
    });
  };

  const handleProductSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!productForm.name.trim()) {
      addToast({ title: "Ürün adı zorunlu", variant: "error" });
      return;
    }

    const requiresSampling = productForm.requiresSampling === "yes";
    const samplingInterval =
      requiresSampling && productForm.samplingIntervalMonths.trim() ? Number(productForm.samplingIntervalMonths) : undefined;
    const labReturnDays = productForm.labReturnDays.trim() ? Number(productForm.labReturnDays) : undefined;

    if (requiresSampling && (!samplingInterval || samplingInterval <= 0)) {
      addToast({ title: "Numune döngüsü geçerli olmalı", variant: "error" });
      return;
    }

    const resolvedType =
      productForm.productTypeSelection === "__custom"
        ? productForm.customProductType.trim()
        : productForm.productTypeSelection;

    if (!resolvedType) {
      addToast({ title: "Ürün tipi zorunlu", variant: "error" });
      return;
    }

    if (productForm.productTypeSelection === "__custom" && !productForm.customProductType.trim()) {
      addToast({ title: "Yeni ürün tipi girin", variant: "error" });
      return;
    }

    addProduct({
      name: productForm.name.trim(),
      productType: resolvedType as ProductType,
      standardNo: productForm.standardNo.trim() || undefined,
      requiresSampling,
      samplingIntervalMonths: samplingInterval,
      labReturnDays
    });

    addToast({ title: "Ürün eklendi", variant: "success" });
    setProductForm({
      name: "",
      productTypeSelection: productTypeOptions[0] ?? DEFAULT_PRODUCT_TYPE ?? "",
      customProductType: "",
      requiresSampling: "yes",
      samplingIntervalMonths: "",
      labReturnDays: "",
      standardNo: ""
    });
  };

  const handleEmployeeSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!employeeForm.name.trim()) {
      addToast({ title: "Ad-Soyad zorunlu", variant: "error" });
      return;
    }

    if (employeeForm.id) {
      await updateEmployee(employeeForm.id, {
        name: employeeForm.name.trim(),
        city: employeeForm.city.trim() || undefined,
        status: employeeForm.status,
        skills: employeeForm.skills
      });
      addToast({ title: "Ekip güncellendi", variant: "success" });
    } else {
      await addEmployee({
        name: employeeForm.name.trim(),
        city: employeeForm.city.trim() || undefined,
        status: employeeForm.status,
        skills: employeeForm.skills
      });
      addToast({ title: "Ekip eklendi", variant: "success" });
    }

    setEmployeeForm({
      id: null,
      name: "",
      city: "",
      status: "available",
      skills: []
    });
  };

  const handleEditEmployee = (employee: Employee) => {
    setEmployeeForm({
      id: employee.id,
      name: employee.name,
      city: employee.city ?? "",
      status: employee.status,
      skills: employee.skills ?? []
    });
  };

  const handleDeleteEmployee = (employee: Employee) => {
    if (!window.confirm(`"${employee.name}" kaydını silmek istediğinize emin misiniz?`)) return;
    deleteEmployee(employee.id);
    addToast({ title: "Ekip silindi", variant: "success" });
    if (employeeForm.id === employee.id) {
      setEmployeeForm({
        id: null,
        name: "",
        city: "",
        status: "available",
        skills: []
      });
    }
  };

  const handleDeleteProduct = (product: Product) => {
    if (!window.confirm(`"${product.name}" ürününü silmek istediğinize emin misiniz?`)) return;
    deleteProduct(product.id);
    addToast({ title: "Ürün silindi", variant: "success" });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Kontrol</h1>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card header="Ekip">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Table columns={employeeColumns} data={employees} keyExtractor={(row) => row.id} emptyState="Kullanıcı bulunamadı" />
            </div>
            <form className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3" onSubmit={handleEmployeeSubmit}>
              <h3 className="text-sm font-semibold text-slate-800">
                {employeeForm.id ? "Ekip Güncelle" : "Yeni Ekip Ekle"}
              </h3>
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                Ad - Soyad
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={employeeForm.name}
                  onChange={(event) => handleEmployeeFormChange("name", event.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                Şehir
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={employeeForm.city}
                  onChange={(event) => handleEmployeeFormChange("city", event.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                Durum
                <select
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={employeeForm.status}
                  onChange={(event) => handleEmployeeFormChange("status", event.target.value as Employee["status"])}
                >
                  <option value="available">Müsait</option>
                  <option value="busy">Meşgul</option>
                </select>
              </label>
              <div className="space-y-1 text-sm font-medium text-slate-700">
                <span>Yetenekler</span>
                <div className="flex flex-wrap gap-2">
                  {productTypeOptions.map((type) => {
                    const active = employeeForm.skills.includes(type);
                    return (
                      <Chip
                        key={type}
                        active={active}
                        className="cursor-pointer"
                        onClick={() => toggleEmployeeSkill(type)}
                      >
                        {getProductTypeLabel(type)}
                      </Chip>
                    );
                  })}
                </div>
              </div>
              <div className="flex gap-2">
                {employeeForm.id ? (
                  <Button type="button" variant="ghost" onClick={() => setEmployeeForm({ id: null, name: "", city: "", status: "available", skills: [] })}>
                    Yeni Kayıt
                  </Button>
                ) : null}
                <Button type="submit" className="flex-1">
                  {employeeForm.id ? "Güncelle" : "Kaydet"}
                </Button>
              </div>
            </form>
          </div>
        </Card>
        <Card header="Numune Döngüleri">
          <div className="space-y-2 text-sm text-slate-600">
            {samplingCycles.map((cycle) => (
              <div key={cycle.productType} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                <span>{getProductTypeLabel(cycle.productType)}</span>
                <strong>{cycle.months} ay</strong>
              </div>
            ))}
            <p className="text-xs text-slate-500">Cüruf ve uçucu kül periyotları prototipte düzenlenebilir olarak gösterilir.</p>
          </div>
        </Card>
      </div>
      <Card header="Ürün Yönetimi">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-800">Tanımlı Ürünler</h3>
            <Table
              columns={productColumns}
              data={sortedProducts}
              keyExtractor={(row) => row.id}
              emptyState="Henüz ürün tanımlanmadı"
              containerClassName="max-h-[480px] overflow-y-auto"
            />
          </div>
          <div>
            <h3 className="mb-3 text-sm font-semibold text-slate-800">Yeni Ürün Ekle</h3>
            <form className="space-y-4" onSubmit={handleProductSubmit}>
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                Ürün Adı
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={productForm.name}
                  onChange={(event) => handleProductFormChange("name", event.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                Ürün Tipi
                <select
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={productForm.productTypeSelection}
                  onChange={(event) => handleProductFormChange("productTypeSelection", event.target.value)}
                >
                  {productTypeOptions.map((type) => (
                    <option key={type} value={type}>
                      {getProductTypeLabel(type)}
                    </option>
                  ))}
                  <option value="__custom">Yeni ürün tipi oluştur</option>
                </select>
              </label>
              {productForm.productTypeSelection === "__custom" ? (
                <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                  Yeni Ürün Tipi
                  <input
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    value={productForm.customProductType}
                    onChange={(event) => handleProductFormChange("customProductType", event.target.value)}
                  />
                </label>
              ) : null}
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                Numune Alınacak mı
                <select
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={productForm.requiresSampling}
                  onChange={(event) => handleProductFormChange("requiresSampling", event.target.value as "yes" | "no")}
                >
                  <option value="yes">Evet</option>
                  <option value="no">Hayır</option>
                </select>
              </label>
              {productForm.requiresSampling === "yes" ? (
                <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                  Numune Döngüsü (Ay)
                  <input
                    type="number"
                    min="1"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    value={productForm.samplingIntervalMonths}
                    onChange={(event) => handleProductFormChange("samplingIntervalMonths", event.target.value)}
                  />
                </label>
              ) : null}
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                Laboratuvar Dönüş Tahmini (Gün)
                <input
                  type="number"
                  min="0"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={productForm.labReturnDays}
                  onChange={(event) => handleProductFormChange("labReturnDays", event.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                Standart
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={productForm.standardNo}
                  onChange={(event) => handleProductFormChange("standardNo", event.target.value)}
                />
              </label>
              <Button type="submit" className="w-full">
                Ürünü Kaydet
              </Button>
            </form>
          </div>
        </div>
      </Card>
      <Card header="E-posta Şablonları">
        <div className="space-y-3 text-sm text-slate-600">
          <div>
            <h3 className="font-semibold text-slate-800">Hatırlatma</h3>
            <p>{"Sayın {{firma}}, {{$data.nextDate}} tarihinde numune ziyaretimiz planlanmıştır."}</p>
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">Laboratuvar Bilgilendirme</h3>
            <p>{"Numune kodu: {{numune_kodu}}. Sonuçlarınızı portaldan takip edebilirsiniz."}</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default SettingsView;
