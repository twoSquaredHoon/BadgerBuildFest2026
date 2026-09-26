import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';

import { ChevronLeft, ChevronRight } from '@/components/icons';
import { formatDuration, formatTime } from '@/lib/dates';
import type { Appointment } from '@/types';

export function Avatar({ letter, size = 44 }: { letter: string; size?: number }) {
  return (
    <div className="avatar" style={{ width: size, height: size, fontSize: size * 0.42 }}>
      {letter}
    </div>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="empty">
      <div className="empty-title">{title}</div>
      <p>{body}</p>
    </div>
  );
}

export function InfoRows({ rows }: { rows: [string, string][] }) {
  return (
    <div className="card info-rows">
      {rows.map(([label, value]) => (
        <div key={label} className="info-row">
          <span className="muted">{label}</span>
          <span className="strong">{value}</span>
        </div>
      ))}
    </div>
  );
}

export function AppointmentRow({ appt }: { appt: Appointment }) {
  const navigate = useNavigate();
  return (
    <button type="button" className="appt-row" onClick={() => navigate(`/appointment/${appt.id}`)}>
      <div className="appt-time">
        <div className="strong">{formatTime(appt.start)}</div>
        <div className="small muted">{formatDuration(appt.duration)}</div>
      </div>
      <div className="appt-body">
        <div className="strong big">{appt.dog.name}</div>
        <div className="small muted ellipsis">
          {appt.dog.breed} · {appt.owner.name}
        </div>
      </div>
      <span className="faint">
        <ChevronRight size={18} />
      </span>
    </button>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="segmented" role="group">
      {options.map((o) => (
        <button key={o.value} type="button" className={o.value === value ? 'on' : ''} aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Header for detail screens, with a back button. */
export function DetailHeader({ title, fallback }: { title: string; fallback: string }) {
  const navigate = useNavigate();
  const back = () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate(fallback);
  };
  return (
    <header className="detail-header">
      <button type="button" className="back" onClick={back} aria-label="Back">
        <ChevronLeft size={22} />
        <span>Back</span>
      </button>
      <div className="detail-title">{title}</div>
      <div style={{ width: 72 }} />
    </header>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <div className="section-label">{children}</div>;
}
