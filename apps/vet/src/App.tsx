import { BrowserRouter, Navigate, Route, Routes } from 'react-router';

import TabLayout from '@/components/TabLayout';
import Toast from '@/components/Toast';
import AppointmentDetail from '@/pages/AppointmentDetail';
import Appointments from '@/pages/Appointments';
import ChatList from '@/pages/ChatList';
import ChatThread from '@/pages/ChatThread';
import PatientDetail from '@/pages/PatientDetail';
import Patients from '@/pages/Patients';
import PracticeSetup from '@/pages/PracticeSetup';
import Requests from '@/pages/Requests';
import SignIn from '@/pages/SignIn';
import Welcome from '@/pages/Welcome';
import { AuthProvider, useAuth } from '@/store/Auth';
import { SideProvider, useSide } from '@/store/Side';
import { VetStoreProvider } from '@/store/VetStore';

export default function App() {
  return (
    <SideProvider>
      <AuthProvider>
        <div className="app">
          <Start />
        </div>
      </AuthProvider>
    </SideProvider>
  );
}

/** Start screen first: the pet owner side opens PawPlan (/owner/), the vet side continues here. */
function Start() {
  const { isVet } = useSide();
  return isVet ? <Gate /> : <Welcome />;
}

/** Vet side: sign-in first, then practice setup (first time only), then the app. */
function Gate() {
  const { status, vet } = useAuth();

  if (status === 'loading') return <div className="auth"><p className="sub center">Loading…</p></div>;
  if (status === 'not-configured' || status === 'signed-out') return <SignIn />;
  if (status === 'needs-profile' || !vet) return <PracticeSetup />;

  return (
    <BrowserRouter>
      <VetStoreProvider key={vet.id} vetId={vet.id}>
        <Routes>
          <Route element={<TabLayout />}>
            <Route index element={<Requests />} />
            <Route path="appointments" element={<Appointments />} />
            <Route path="patients" element={<Patients />} />
            <Route path="chat" element={<ChatList />} />
          </Route>
          <Route path="appointment/:id" element={<AppointmentDetail />} />
          <Route path="patient/:id" element={<PatientDetail />} />
          <Route path="chat/:id" element={<ChatThread />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toast />
      </VetStoreProvider>
    </BrowserRouter>
  );
}
