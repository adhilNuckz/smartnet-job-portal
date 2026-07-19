import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import RequireAuth from './components/RequireAuth';
import LoginPage from './pages/LoginPage';
import OwnerDashboard from './pages/OwnerDashboard';
import NewJobPage from './pages/NewJobPage';
import OwnerJobDetail from './pages/OwnerJobDetail';
import TranslatorDashboard from './pages/TranslatorDashboard';
import TranslatorJobDetail from './pages/TranslatorJobDetail';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard/owner" element={<RequireAuth role="owner"><OwnerDashboard /></RequireAuth>} />
          <Route path="/dashboard/owner/new" element={<RequireAuth role="owner"><NewJobPage /></RequireAuth>} />
          <Route path="/dashboard/owner/job/:id" element={<RequireAuth role="owner"><OwnerJobDetail /></RequireAuth>} />
          <Route path="/dashboard/translator" element={<RequireAuth role="translator"><TranslatorDashboard /></RequireAuth>} />
          <Route path="/dashboard/translator/job/:id" element={<RequireAuth role="translator"><TranslatorJobDetail /></RequireAuth>} />
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
