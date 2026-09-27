import { useState } from 'react';
import { useNavigate } from 'react-router';

import { ChevronLeft, ChevronRight } from '@/components/icons';
import { AppointmentRow, SectionLabel, Segmented } from '@/components/ui';
import { addDays, dayLong, dayShort, DOW_SHORT, formatRange, hourLabel, MONTHS_LONG, MONTHS_SHORT, parseDate, todayISO, toISO } from '@/lib/dates';
import { useVetStore } from '@/store/VetStore';
import type { Appointment, OpenSlot } from '@/types';

type CalView = 'month' | 'week' | 'day';
const HOURS = Array.from({ length: 10 }, (_, i) => 8 + i); // 8 AM – 5 PM

export default function Appointments() {
  const { appointments, openSlots } = useVetStore();
  const today = todayISO();
  const [view, setView] = useState<CalView>('week');
  const [cursor, setCursor] = useState(today);
  const [picked, setPicked] = useState(today);

  const cur = parseDate(cursor);
  const onDay = (iso: string) => appointments.filter((a) => a.date === iso);
  const openOn = (iso: string) => openSlots.filter((s) => s.date === iso);

  const shift = (dir: number) => {
    let next: Date;
    if (view === 'month') next = new Date(cur.getFullYear(), cur.getMonth() + dir, 1);
    else if (view === 'week') next = addDays(cur, 7 * dir);
    else next = addDays(cur, dir);
    setCursor(toISO(next));
  };

  const changeView = (v: CalView) => {
    if (v === 'month') setPicked(cursor);
    if (v === 'day' && view === 'month') setCursor(picked);
    setView(v);
  };

  const weekStart = addDays(cur, -cur.getDay());
  const weekDays = Array.from({ length: 7 }, (_, i) => toISO(addDays(weekStart, i)));

  let title: string;
  if (view === 'month') title = `${MONTHS_LONG[cur.getMonth()]} ${cur.getFullYear()}`;
  else if (view === 'week') {
    const end = addDays(weekStart, 6);
    title = `${MONTHS_SHORT[weekStart.getMonth()]} ${weekStart.getDate()} – ${MONTHS_SHORT[end.getMonth()]} ${end.getDate()}`;
  } else title = dayShort(cursor);

  return (
    <div className="stack">
      <Segmented
        options={[
          { label: 'Month', value: 'month' },
          { label: 'Week', value: 'week' },
          { label: 'Day', value: 'day' },
        ]}
        value={view}
        onChange={changeView}
      />

      <div className="nav-row">
        <button type="button" className="icon-btn" onClick={() => shift(-1)} aria-label="Previous">
          <ChevronLeft size={20} />
        </button>
        <button type="button" className="nav-title" onClick={() => { setCursor(today); setPicked(today); }} aria-label="Go to today">
          {title}
        </button>
        <button type="button" className="icon-btn" onClick={() => shift(1)} aria-label="Next">
          <ChevronRight size={20} />
        </button>
      </div>

      {view === 'month' && (
        <MonthView cursor={cur} today={today} picked={picked} onPick={setPicked} countFor={(iso) => onDay(iso).length} list={onDay(picked)} open={openOn(picked).length} />
      )}

      {view === 'week' && (
        <div className="stack">
          <div className="card strip">
            {weekDays.map((iso, i) => {
              const d = parseDate(iso);
              return (
                <button key={iso} type="button" className="strip-day" onClick={() => { setCursor(iso); setView('day'); }}>
                  <span className="small muted">{DOW_SHORT[i]}</span>
                  <span className={`daynum ${iso === today ? 'on' : ''}`}>{d.getDate()}</span>
                  <span className={`dot ${onDay(iso).length ? 'on' : ''}`} />
                </button>
              );
            })}
          </div>
          {weekDays.map((iso) => {
            const list = onDay(iso);
            const open = openOn(iso).length;
            if (!list.length && !open) return null;
            return (
              <div key={iso} className="stack tight">
                <SectionLabel>{dayLong(iso)}</SectionLabel>
                {list.map((a) => <AppointmentRow key={a.id} appt={a} />)}
                {open > 0 && <OpenCount n={open} onClick={() => { setCursor(iso); setView('day'); }} />}
              </div>
            );
          })}
          {weekDays.every((iso) => onDay(iso).length === 0 && openOn(iso).length === 0) && <p className="sub">No appointments or open times this week.</p>}
        </div>
      )}

      {view === 'day' && <DayView list={onDay(cursor)} open={openOn(cursor)} />}
    </div>
  );
}

/** "12 open slots" line under a day; tapping it opens that day. */
function OpenCount({ n, onClick }: { n: number; onClick?: () => void }) {
  return (
    <button type="button" className="open-count" onClick={onClick}>
      {n} open {n === 1 ? 'slot' : 'slots'}
    </button>
  );
}

function MonthView({
  cursor, today, picked, onPick, countFor, list, open,
}: {
  cursor: Date; today: string; picked: string; onPick: (iso: string) => void; countFor: (iso: string) => number; list: Appointment[]; open: number;
}) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const start = addDays(first, -first.getDay());
  const cells = Array.from({ length: 42 }, (_, i) => addDays(start, i));

  return (
    <div className="stack">
      <div className="card month">
        <div className="month-grid">
          {DOW_SHORT.map((d) => (
            <div key={d} className="month-dow">{d[0]}</div>
          ))}
          {cells.map((d) => {
            const iso = toISO(d);
            const inMonth = d.getMonth() === cursor.getMonth();
            const n = countFor(iso);
            const cls = ['daynum', iso === picked ? 'on' : '', iso === today && iso !== picked ? 'today' : '', inMonth ? '' : 'out'].join(' ');
            return (
              <button key={iso} type="button" className="month-cell" onClick={() => onPick(iso)} aria-label={`${dayLong(iso)}${n ? `, ${n} appointments` : ''}`}>
                <span className={cls}>{d.getDate()}</span>
                <span className={`dot ${n ? (inMonth ? 'on' : 'faint') : ''}`} />
              </button>
            );
          })}
        </div>
      </div>
      <SectionLabel>{dayLong(picked)}</SectionLabel>
      {list.map((a) => <AppointmentRow key={a.id} appt={a} />)}
      {list.length === 0 && <p className="sub">No appointments this day.</p>}
      {open > 0 && <OpenCount n={open} />}
    </div>
  );
}

function DayView({ list, open }: { list: Appointment[]; open: OpenSlot[] }) {
  const navigate = useNavigate();
  return (
    <div className="card day">
      {HOURS.map((h) => (
        <div key={h} className="slot">
          <div className="slot-label">{hourLabel(h)}</div>
          <div className="slot-body">
            {list
              .filter((a) => Math.floor(a.start) === h)
              .map((a) => (
                <button key={a.id} type="button" className="block" onClick={() => navigate(`/appointment/${a.id}`)}>
                  <span className="strong">{a.dog.name}</span>
                  <span className="small">
                    {formatRange(a.start, a.duration)} · {a.owner.name}
                  </span>
                </button>
              ))}
            {open
              .filter((s) => Math.floor(s.start) === h)
              .map((s) => (
                <div key={s.start} className="block open">
                  <span className="small">Open · {formatRange(s.start, s.duration)}</span>
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
