import { useNavigate } from 'react-router';

import { ChevronRight } from '@/components/icons';
import { Avatar, EmptyState } from '@/components/ui';
import { useVetStore } from '@/store/VetStore';

export default function Patients() {
  const { patients } = useVetStore();
  const navigate = useNavigate();

  if (patients.length === 0) {
    return <EmptyState title="No patients yet" body="Dogs show up here after their first visit." />;
  }

  return (
    <div className="stack">
      <p className="sub">
        {patients.length} {patients.length === 1 ? 'dog has' : 'dogs have'} visited your practice
      </p>
      <div className="card list">
        {patients.map((p) => (
          <button key={p.id} type="button" className="list-row" onClick={() => navigate(`/patient/${p.id}`)}>
            <Avatar letter={p.dog.name[0]} />
            <div className="grow">
              <div className="strong big">{p.dog.name}</div>
              <div className="small muted ellipsis">
                {[p.dog.breed, p.owner.name].filter(Boolean).join(' · ')}
              </div>
            </div>
            <span className="small muted">
              {p.visits.length} {p.visits.length === 1 ? 'visit' : 'visits'}
            </span>
            <span className="faint">
              <ChevronRight size={18} />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
