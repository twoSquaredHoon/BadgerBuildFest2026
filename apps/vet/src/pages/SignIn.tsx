import { useState, type FormEvent } from 'react';

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
  const { status, error, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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

  const isSignUp = mode === 'signup';

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const err = isSignUp ? await signUp(email, password) : await signIn(email, password);
    setBusy(false);
    if (err) setMessage(err);
  };

  return (
    <form className="auth" onSubmit={submit}>
      <BackToStart />
      <div className="auth-brand">Vet Side</div>
      <p className="auth-lead">
        {isSignUp
          ? 'Create an account for your practice.'
          : 'Booking requests, appointments and chats for your practice, in one place.'}
      </p>

      <label className="field">
        <span className="label">Email</span>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" inputMode="email" />
      </label>
      <label className="field">
        <span className="label">Password</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          autoComplete={isSignUp ? 'new-password' : 'current-password'}
        />
      </label>

      {(message ?? error) && (
        <p className="auth-error" role="alert">
          {message ?? error}
        </p>
      )}

      <button type="submit" className="btn primary" disabled={busy}>
        {busy ? 'One moment…' : isSignUp ? 'Create account' : 'Sign in'}
      </button>
      <button
        type="button"
        className="btn text"
        onClick={() => {
          setMode(isSignUp ? 'signin' : 'signup');
          setMessage(null);
        }}>
        {isSignUp ? 'Already have an account? Sign in' : 'New here? Create an account'}
      </button>
    </form>
  );
}
