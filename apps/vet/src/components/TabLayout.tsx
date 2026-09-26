import { NavLink, Outlet, useLocation } from 'react-router';

import { CalendarIcon, ChatIcon, ClipboardIcon, InboxIcon } from '@/components/icons';
import { useAuth } from '@/store/Auth';
import { useVetStore } from '@/store/VetStore';

const TITLES: Record<string, string> = {
  '/': 'Requests',
  '/appointments': 'Appointments',
  '/patients': 'Patients',
  '/chat': 'Chat',
};

export default function TabLayout() {
  const { pathname } = useLocation();
  const { requests } = useVetStore();
  const { vet, signOut } = useAuth();
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <>
      <header className="tab-header">
        <div>
          <div className="small muted">{today}</div>
          <h1>{TITLES[pathname] ?? 'Vet Side'}</h1>
        </div>
        <button type="button" className="signout" onClick={signOut} title={vet ? `Signed in as ${vet.name}` : undefined}>
          Sign out
        </button>
      </header>

      <main className="tab-main">
        <Outlet />
      </main>

      <nav className="tabbar" aria-label="Main">
        <NavLink to="/" end className="tab">
          <span className="tab-icon">
            <InboxIcon />
            {requests.length > 0 && <span className="badge">{requests.length}</span>}
          </span>
          <span>Requests</span>
        </NavLink>
        <NavLink to="/appointments" className="tab">
          <CalendarIcon />
          <span>Appointments</span>
        </NavLink>
        <NavLink to="/patients" className="tab">
          <ClipboardIcon />
          <span>Patients</span>
        </NavLink>
        <NavLink to="/chat" className="tab">
          <ChatIcon />
          <span>Chat</span>
        </NavLink>
      </nav>
    </>
  );
}
