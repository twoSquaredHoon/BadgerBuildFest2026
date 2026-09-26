import { useNavigate } from 'react-router';

import { Avatar, EmptyState } from '@/components/ui';
import { dayShort } from '@/lib/dates';
import { useVetStore } from '@/store/VetStore';

export default function ChatList() {
  const { appointments, messages } = useVetStore();
  const navigate = useNavigate();

  return (
    <div className="stack">
      <p className="sub">Talk with owners before the visit</p>
      {appointments.length === 0 ? (
        <EmptyState title="No conversations yet" body="Chat opens once you accept a booking request." />
      ) : (
        <div className="card list">
          {appointments.map((a) => {
            const thread = messages[a.id] ?? [];
            const last = thread[thread.length - 1];
            return (
              <button key={a.id} type="button" className="list-row" onClick={() => navigate(`/chat/${a.id}`)}>
                <Avatar letter={a.owner.name[0]} />
                <div className="grow">
                  <div className="between">
                    <span className="strong big">{a.owner.name}</span>
                    <span className="small muted">{dayShort(a.date).split(', ')[1]}</span>
                  </div>
                  <div className="small">About {a.dog.name}</div>
                  <div className="small muted ellipsis">{last ? last.text : 'No messages yet'}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
