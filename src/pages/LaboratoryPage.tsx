import LabInboxView from "../features/laboratory/LabInboxView";
import LabProcessingView from "../features/laboratory/LabProcessingView";

const LaboratoryPage = () => {
  return (
    <div className="space-y-10">
      <LabProcessingView />
      <LabInboxView />
    </div>
  );
};

export default LaboratoryPage;
