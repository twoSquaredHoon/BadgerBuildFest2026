import { useNavigate, useParams } from 'react-router';

import { CheckIcon } from '@/components/icons';
import { Avatar, DetailHeader, EmptyState, InfoRows } from '@/components/ui';
import { dayLong, formatRange } from '@/lib/dates';
import { useVetStore } from '@/store/VetStore';

export default function AppointmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { appointments, calendarAdded, addToCalendar, completeAppointment } = useVetStore();
  const appt = appointments.find((a) => a.id === id);

  if (!appt) {
    return (
      <>
        <DetailHeader title="Appointment" fallback="/appointments" />
        <div className="page">
          <EmptyState title="Appointment not found" body="It may have been completed or removed." />
        </div>
      </>
    );
  }

  return (
    <>
      <DetailHeader title={appt.dog.name} fallback="/appointments" />
      <div className="page stack loose">
        <div className="hero">
          <Avatar letter={appt.dog.name[0]} size={84} />
          <div className="hero-name">{appt.dog.name}</div>
          <div className="muted">{appt.dog.breed}</div>
        </div>

        <div className="when">
          <div className="strong">{dayLong(appt.date)}</div>
          <div className="small">{formatRange(appt.start, appt.duration)}</div>
        </div>

        <InfoRows
          rows={[
            ['Age', appt.dog.age],
            ['Weight', appt.dog.weight],
            ['Owner', appt.owner.name],
            ['Phone', appt.owner.phone],
          ]}
        />

        <div className="stack tight">
          <button type="button" className="btn primary" onClick={() => navigate(`/chat/${appt.id}`)}>
            Chat with {appt.owner.name.split(' ')[0]}
          </button>
          {calendarAdded[appt.id] ? (
            <div className="added">
              <CheckIcon size={18} /> Calendar invite downloaded
            </div>
          ) : (
            <button type="button" className="btn outline" onClick={() => addToCalendar(appt.id)}>
              Add to Apple Calendar
            </button>
          )}
          <button
            type="button"
            className="btn text"
            onClick={() => {
              completeAppointment(appt.id);
              navigate('/appointments', { replace: true });
            }}>
            Mark visit complete
          </button>
        </div>
      </div>
    </>
  );
}
