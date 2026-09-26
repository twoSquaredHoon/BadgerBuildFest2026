import { BrowserRouter, Navigate, Route, Routes } from 'react-router';

import TabLayout from '@/components/TabLayout';
import Toast from '@/components/Toast';
import AppointmentDetail from '@/pages/AppointmentDetail';
import Appointments from '@/pages/Appointments';
import ChatList from '@/pages/ChatList';
import ChatThread from '@/pages/ChatThread';
import PatientDetail from '@/pages/PatientDetail';
import Patients from '@/pages/Patients';
import Requests from '@/pages/Requests';
import { VetStoreProvider } from '@/store/VetStore';

export default function App() {
  return (
    <BrowserRouter>
      <VetStoreProvider>
        <div className="app">
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
        </div>
      </VetStoreProvider>
    </BrowserRouter>
  );
}
