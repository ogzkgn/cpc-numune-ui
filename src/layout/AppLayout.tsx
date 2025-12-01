import { Outlet } from "react-router-dom";

import ToastContainer from "../components/ui/ToastContainer";
import TripPlannerModal from "../features/trips/TripPlannerModal";
import Topbar from "./Topbar";

const AppLayout = () => {
  return (
    <div className="flex min-h-screen flex-col bg-slate-100 text-slate-900">
      <ToastContainer />
      <TripPlannerModal />
      <Topbar />
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
