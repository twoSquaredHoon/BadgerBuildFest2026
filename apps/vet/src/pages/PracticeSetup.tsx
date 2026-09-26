import { useState, type FormEvent } from 'react';

import { useAuth } from '@/store/Auth';

/** Shown once, right after a vet's first sign-in, to create their row in `vets`. */
export default function PracticeSetup() {
  const { session, saveProfile, signOut } = useAuth();
  const meta = session?.user.user_metadata ?? {};
  const [name, setName] = useState<string>(meta.full_name ?? meta.name ?? '');
  const [clinic, setClinic] = useState('');
  const [location, setLocation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await saveProfile({ name: name.trim(), clinic: clinic.trim(), location: location.trim() });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save. Try again.');
      setBusy(false);
    }
  };

  return (
    <form className="auth" onSubmit={submit}>
      <div className="auth-brand">Set up your practice</div>
      <p className="auth-lead">Pet owners see this when they pick a clinic.</p>

      <label className="field">
        <span className="label">Your name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
      </label>
      <label className="field">
        <span className="label">Clinic name</span>
        <input value={clinic} onChange={(e) => setClinic(e.target.value)} required placeholder="e.g. Willy Street Vet" />
      </label>
      <label className="field">
        <span className="label">City</span>
        <input value={location} onChange={(e) => setLocation(e.target.value)} required placeholder="e.g. Madison, WI" />
      </label>

      {error && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}

      <button type="submit" className="btn primary" disabled={busy}>
        {busy ? 'Saving…' : 'Continue'}
      </button>
      <button type="button" className="btn text" onClick={signOut}>
        Use a different account
      </button>
    </form>
  );
}
