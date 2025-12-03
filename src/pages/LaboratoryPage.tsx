import { useState } from "react";

import LabInboxView from "../features/laboratory/LabInboxView";
import LabProcessingView from "../features/laboratory/LabProcessingView";

const LaboratoryPage = () => {
  const [activeTab, setActiveTab] = useState<"processing" | "inbox">("processing");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <button
          className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
            activeTab === "processing"
              ? "border-brand-primary bg-brand-primary text-white"
              : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
          }`}
          onClick={() => setActiveTab("processing")}
        >
          Gönderilenler
        </button>
        <button
          className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
            activeTab === "inbox"
              ? "border-brand-primary bg-brand-primary text-white"
              : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
          }`}
          onClick={() => setActiveTab("inbox")}
        >
          Gelenler
        </button>
      </div>

      {activeTab === "processing" ? <LabProcessingView /> : <LabInboxView />}
    </div>
  );
};

export default LaboratoryPage;
