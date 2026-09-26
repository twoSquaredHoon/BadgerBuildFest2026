import { useState } from 'react';

import { ChevronLeft } from '@/components/icons';
import { useAuth } from '@/store/Auth';
import { useSide } from '@/store/Side';

function BackToStart() {
  const { backToStart } = useSide();
  return (
    <button type="button" className="auth-back" onClick={backToStart}>
      <ChevronLeft size={20} /> Back
    </button>
  );
}

export default function SignIn() {
  const { status, error, signInWithGoogle } = useAuth();
  const [busy, setBusy] = useState(false);

  if (status === 'not-configured') {
    return (
      <div className="auth">
        <BackToStart />
        <div className="auth-brand">Vet Side</div>
        <div className="empty">
          <div className="empty-title">Backend not connected</div>
          <p>
            Add your Supabase URL and key to <code>apps/vet/.env</code>, then restart <code>npm run dev</code>. Steps are in{' '}
            <code>docs/backend-setup.md</code>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth">
      <BackToStart />
        <div className="auth-brand">Vet Side</div>
      <p className="auth-lead">Booking requests, appointments and chats for your practice, in one place.</p>
      <button
        type="button"
        className="btn outline auth-google"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await signInWithGoogle();
          setBusy(false); // only reached if Google didn't open
        }}>
        {busy ? 'Opening Google…' : 'Continue with Google'}
      </button>
      {error && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
