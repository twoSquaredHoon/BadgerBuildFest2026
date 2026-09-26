import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useParams } from 'react-router';

import { SendIcon } from '@/components/icons';
import { DetailHeader, EmptyState } from '@/components/ui';
import { dayShort, formatMessageTime, formatTime } from '@/lib/dates';
import { useVetStore } from '@/store/VetStore';

export default function ChatThread() {
  const { id } = useParams();
  const { appointments, messages, sendMessage } = useVetStore();
  const [draft, setDraft] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const appt = appointments.find((a) => a.id === id);
  const thread = appt ? (messages[appt.id] ?? []) : [];

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [thread.length]);

  if (!appt) {
    return (
      <>
        <DetailHeader title="Chat" fallback="/chat" />
        <div className="page">
          <EmptyState title="Chat unavailable" body="Chat is only open for accepted appointments." />
        </div>
      </>
    );
  }

  const firstName = appt.owner.name.split(' ')[0];
  const send = (e: FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    sendMessage(appt.id, draft);
    setDraft('');
  };

  return (
    <div className="chat">
      <DetailHeader title={appt.owner.name} fallback="/chat" />
      <div className="chat-banner small muted">
        {appt.dog.name} · Visit {dayShort(appt.date)}, {formatTime(appt.start)}
      </div>
      <div className="chat-messages">
        {thread.length === 0 && <p className="sub center">No messages yet. Say hello to {firstName} before the visit.</p>}
        {thread.map((m, i) => {
          const mine = m.from === 'vet';
          return (
            <div key={i} className={`msg ${mine ? 'mine' : 'theirs'}`}>
              <div className="bubble">{m.text}</div>
              <div className="small muted">
                {mine ? 'You' : firstName} · {formatMessageTime(m.sentAt)}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      <form className="chat-input" onSubmit={send}>
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Message" aria-label="Message" />
        <button type="submit" className="send" aria-label="Send">
          <SendIcon size={20} />
        </button>
      </form>
    </div>
  );
}
