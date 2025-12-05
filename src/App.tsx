import { Routes, Route } from 'react-router-dom';

import AppLayout from './layout/AppLayout';
import DashboardPage from './pages/DashboardPage';
import DueThisMonthPage from './pages/DueThisMonthPage';
import CompanyProductsPage from './pages/CompanyProductsPage';
import TripsPage from './pages/TripsPage';
import LaboratoryPage from './pages/LaboratoryPage';
import SamplesPage from './pages/SamplesPage';
import SettingsPage from './pages/SettingsPage';
import NotFoundPage from './pages/NotFoundPage';
import LoginPage from './pages/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';

const App = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/bu-ay-vadesi" element={<DueThisMonthPage />} />
          <Route path="/firma-urunleri" element={<CompanyProductsPage />} />
          <Route path="/seyahatler" element={<TripsPage />} />
          <Route path="/laboratuvar" element={<LaboratoryPage />} />
          <Route path="/numuneler" element={<SamplesPage />} />
          <Route path="/ayarlar" element={<SettingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
};

export default App;
