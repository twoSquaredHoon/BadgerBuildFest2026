import { useParams } from 'react-router';

import { Avatar, DetailHeader, EmptyState, InfoRows, SectionLabel } from '@/components/ui';
import { dateShort } from '@/lib/dates';
import { useVetStore } from '@/store/VetStore';

export default function PatientDetail() {
  const { id } = useParams();
  const { patients } = useVetStore();
  const p = patients.find((x) => x.id === id);

  if (!p) {
    return (
      <>
        <DetailHeader title="Patient" fallback="/patients" />
        <div className="page">
          <EmptyState title="Patient not found" body="Go back and pick another dog." />
        </div>
      </>
    );
  }

  return (
    <>
      <DetailHeader title={p.dog.name} fallback="/patients" />
      <div className="page stack loose">
        <div className="hero">
          <Avatar letter={p.dog.name[0]} size={84} />
          <div className="hero-name">{p.dog.name}</div>
          <div className="muted">{p.dog.breed}</div>
        </div>

        <InfoRows
          rows={[
            ['Age', p.dog.age],
            ['Weight', p.dog.weight],
            ['Owner', p.owner.name],
            ['Phone', p.owner.phone],
          ]}
        />

        <div className="stack tight">
          <SectionLabel>Past visits</SectionLabel>
          <div className="card info-rows">
            {p.visits.map((v, i) => (
              <div key={`${v.date}-${i}`} className="info-row">
                <span className="strong">{v.type}</span>
                <span className="muted">{dateShort(v.date)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
