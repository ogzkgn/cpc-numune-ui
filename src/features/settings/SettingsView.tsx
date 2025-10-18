import Badge from "../../components/ui/Badge";
import Card from "../../components/ui/Card";
import Table from "../../components/ui/Table";
import { useAppStore } from "../../state/useAppStore";
import { employeeStatusLabels, employeeStatusTokens, productTypeLabels } from "../../utils/labels";
import type { TableColumn } from "../../components/ui/Table";
import type { Employee } from "../../types";

const SettingsView = () => {
  const employees = useAppStore((state) => state.employees);
  const samplingCycles = useAppStore((state) => state.samplingCycles);

  const employeeColumns: TableColumn<Employee>[] = [
    { id: "name", header: "Ad", cell: (row) => row.name },
    { id: "city", header: "Şehir", cell: (row) => row.city ?? "-" },
    { id: "skills", header: "Yetenek", cell: (row) => row.skills.map((skill) => productTypeLabels[skill]).join(", ") },
    {
      id: "status",
      header: "Durum",
      cell: (row) => <Badge className={employeeStatusTokens[row.status]}>{employeeStatusLabels[row.status]}</Badge>
    }
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Kontrol</h1>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card header="Ekip">
          <Table columns={employeeColumns} data={employees} keyExtractor={(row) => row.id} emptyState="Kullanıcı bulunamadı" />
        </Card>
        <Card header="Numune Döngüleri">
          <div className="space-y-2 text-sm text-slate-600">
            {samplingCycles.map((cycle) => (
              <div key={cycle.productType} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                <span>{productTypeLabels[cycle.productType]}</span>
                <strong>{cycle.months} ay</strong>
              </div>
            ))}
            <p className="text-xs text-slate-500">Cüruf ve uçucu kül periyotları prototipte düzenlenebilir olarak gösterilir.</p>
          </div>
        </Card>
      </div>
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