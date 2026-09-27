import { Avatar, EmptyState, TriageSummary } from '@/components/ui';
import { dayShort, formatRange } from '@/lib/dates';
import { useVetStore } from '@/store/VetStore';

export default function Requests() {
  const { requests, acceptRequest, declineRequest } = useVetStore();
  const n = requests.length;

  return (
    <div className="stack">
      <p className="sub">{n ? `${n} ${n === 1 ? 'owner is' : 'owners are'} waiting for your reply` : 'No requests waiting'}</p>

      {requests.map((r) => (
        <article key={r.id} className="card request">
          <div className="request-head">
            <Avatar letter={r.dog.name[0]} size={48} />
            <div>
              <div className="pet-name">{r.dog.name}</div>
              <div className="muted">
                {[r.dog.breed, r.dog.age, r.dog.weight].filter(Boolean).join(' · ')}
              </div>
            </div>
          </div>
          {r.triage && <TriageSummary triage={r.triage} />}
          <div className="info-box">
            <div>
              <div className="label">Owner</div>
              <div className="strong">{r.owner.name}</div>
              <div className="small">{r.owner.phone}</div>
            </div>
            <div>
              <div className="label">Requested</div>
              <div className="strong">{dayShort(r.date)}</div>
              <div className="small">{formatRange(r.start, r.duration)}</div>
            </div>
          </div>
          <div className="two-buttons">
            <button type="button" className="btn outline" onClick={() => declineRequest(r.id)}>
              Decline
            </button>
            <button type="button" className="btn primary" onClick={() => acceptRequest(r.id)}>
              Accept
            </button>
          </div>
        </article>
      ))}

      {n === 0 && <EmptyState title="You're all caught up" body="New booking requests from pet owners will show up here." />}
    </div>
  );
}
