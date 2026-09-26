import { ChevronRight, PawIcon, StethoscopeIcon } from '@/components/icons';
import { useSide } from '@/store/Side';

/** Start screen: choose the pet owner side (PawPlan) or the vet side. */
export default function Welcome() {
  const { chooseVet } = useSide();

  return (
    <div className="auth welcome">
      <div className="auth-brand">PawPlan</div>
      <p className="auth-lead">Plan your dog's vet visit before the bill arrives, or run your practice.</p>

      <div className="section-label">Continue as</div>

      <a className="role-card" href="/owner/">
        <span className="role-icon">
          <PawIcon size={26} />
        </span>
        <span className="grow">
          <span className="role-title">Pet owner</span>
          <span className="role-body">Check your dog's symptoms, see local vet prices, and find a visit.</span>
        </span>
        <span className="faint">
          <ChevronRight size={20} />
        </span>
      </a>

      <button type="button" className="role-card" onClick={chooseVet}>
        <span className="role-icon">
          <StethoscopeIcon size={26} />
        </span>
        <span className="grow">
          <span className="role-title">Vet</span>
          <span className="role-body">Manage booking requests, appointments, patients, and chats.</span>
        </span>
        <span className="faint">
          <ChevronRight size={20} />
        </span>
      </button>

      <p className="welcome-foot">Badger BuildFest 2026</p>
    </div>
  );
}
