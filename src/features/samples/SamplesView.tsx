import Card from "../../components/ui/Card";
import TripSamplesPanel from "./TripSamplesPanel";
import { useAppStore } from "../../state/useAppStore";

const SamplesView = () => {
  const activeRole = useAppStore((state) => state.activeRole);

  if (activeRole !== "admin") {
    return (
      <Card className="mt-6">
        <div className="space-y-2 text-center text-sm text-slate-500">
          <h1 className="text-2xl font-semibold text-slate-900">Numuneler</h1>
          <p>Bu alan yalnızca yönetici rolü tarafından görüntülenebilir.</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Numuneler</h1>
      <TripSamplesPanel />
    </div>
  );
};

export default SamplesView;
