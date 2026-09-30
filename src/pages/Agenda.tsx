import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconPlus } from '../components/icons';
import { ConfirmButton, ErrorBox, Field, Loading, MemberSelect, Modal, MonthPicker } from '../components/ui';
import { api } from '../lib/api';
import { brl, currentMonth, todayISO, weekday } from '../lib/format';
import { useAction, useLoad } from '../lib/hooks';
import type { CalEvent, CalendarItem } from '../lib/types';

const TYPE_COLOR: Record<CalendarItem['type'], string> = {
  event: '#2563eb',
  bill: '#ea580c',
  invoice: '#7c3aed',
  task: '#0f766e',
  income: '#16a34a',
};
const TYPE_LABEL: Record<CalendarItem['type'], string> = { event: 'Compromisso', bill: 'Conta', invoice: 'Fatura', task: 'Tarefa', income: 'Entrada' };

export function Agenda() {
  const [month, setMonth] = useState(currentMonth());
  const [selected, setSelected] = useState(todayISO());
  const { data, error, reload } = useLoad(() => api.get<{ items: CalendarItem[] }>(`/calendar?month=${month}`), [month]);
  const [eventModal, setEventModal] = useState<CalEvent | 'new' | null>(null);
  const navigate = useNavigate();

  const changeMonth = (m: string) => {
    setMonth(m);
    setSelected(m === currentMonth() ? todayISO() : `${m}-01`);
  };

  const [y, mo] = month.split('-').map(Number);
  const firstWeekday = new Date(Date.UTC(y, mo - 1, 1)).getUTCDay();
  const days = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  const today = todayISO();
  const items = data?.items ?? [];
  const byDay = new Map<string, CalendarItem[]>();
  for (const i of items) byDay.set(i.date, [...(byDay.get(i.date) ?? []), i]);
  const dayItems = byDay.get(selected) ?? [];

  const open = async (i: CalendarItem) => {
    if (i.type === 'event') {
      const events = await api.get<CalEvent[]>(`/events?month=${month}`);
      const e = events.find((x) => x.id === i.id);
      if (e) setEventModal(e);
    } else if (i.type === 'bill') navigate('/contas');
    else if (i.type === 'invoice') navigate('/cartoes');
    else if (i.type === 'task') navigate('/tarefas');
    else navigate('/dinheiro');
  };

  return (
    <div className="stack">
      <div className="page-head">
        <h1>Agenda</h1>
        <MonthPicker value={month} onChange={changeMonth} />
      </div>
      <ErrorBox error={error} />

      <div className="card">
        {!data && !error ? (
          <Loading />
        ) : (
          <div className="cal">
            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
              <div key={i} className="wd">
                {d}
              </div>
            ))}
            {Array.from({ length: firstWeekday }, (_, i) => (
              <div key={`o${i}`} className="day out" />
            ))}
            {Array.from({ length: days }, (_, i) => {
              const iso = `${month}-${String(i + 1).padStart(2, '0')}`;
              const its = byDay.get(iso) ?? [];
              const types = [...new Set(its.map((x) => x.type))];
              return (
                <button key={iso} className={`day${iso === today ? ' today' : ''}${iso === selected ? ' sel' : ''}`} onClick={() => setSelected(iso)}>
                  <span className="n">{i + 1}</span>
                  <span className="dots">
                    {types.map((t) => (
                      <span key={t} className="dot" style={{ background: its.some((x) => x.type === t && x.overdue) ? 'var(--danger)' : TYPE_COLOR[t] }} />
                    ))}
                  </span>
                </button>
              );
            })}
          </div>
        )}
        <div className="row wrap small muted" style={{ marginTop: 12, gap: 12 }}>
          {(Object.keys(TYPE_COLOR) as CalendarItem['type'][]).map((t) => (
            <span key={t} className="row" style={{ gap: 4 }}>
              <span className="dot" style={{ background: TYPE_COLOR[t] }} />
              {TYPE_LABEL[t]}
            </span>
          ))}
        </div>
      </div>

      <div className="card flush">
        <div className="card-head">
          <h2>
            {weekday(selected)}, {selected.slice(8, 10)}/{selected.slice(5, 7)}
          </h2>
          <button className="btn small primary" onClick={() => setEventModal('new')}>
            + Compromisso
          </button>
        </div>
        {dayItems.length === 0 ? (
          <div className="empty small">Nada neste dia.</div>
        ) : (
          <div className="list">
            {dayItems.map((i) => (
              <button key={`${i.type}${i.id}`} className={`item${i.status === 'PAGO' ? ' done' : ''}`} onClick={() => open(i)}>
                <span className="dot" style={{ background: i.color ?? TYPE_COLOR[i.type], width: 12, height: 12 }} />
                <div className="grow">
                  <div className="title">
                    {i.time && <span className="muted">{i.time} · </span>}
                    {i.title}
                  </div>
                  <div className={`sub ${i.overdue ? 'danger-text' : ''}`}>
                    {TYPE_LABEL[i.type]}
                    {i.status === 'PAGO' && ' · paga'}
                    {i.overdue && ' · atrasada'}
                  </div>
                </div>
                {i.amountCents != null && <span className={`amount num ${i.type === 'income' ? 'ok-text' : ''}`}>{brl(i.amountCents)}</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      <button className="fab" onClick={() => setEventModal('new')} aria-label="Novo compromisso">
        <IconPlus />
      </button>

      {eventModal && (
        <EventModal
          event={eventModal === 'new' ? undefined : eventModal}
          date={selected}
          onClose={() => setEventModal(null)}
          onDone={() => {
            setEventModal(null);
            reload();
          }}
        />
      )}
    </div>
  );
}

function EventModal({ event, date, onClose, onDone }: { event?: CalEvent; date: string; onClose: () => void; onDone: () => void }) {
  const [title, setTitle] = useState(event?.title ?? '');
  const [d, setD] = useState(event?.date ?? date);
  const [time, setTime] = useState(event?.time ?? '');
  const [memberId, setMemberId] = useState(event?.memberId ?? null);
  const [notes, setNotes] = useState(event?.notes ?? '');
  const { busy, error, run } = useAction();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = { title, date: d, time: time || null, memberId, notes: notes || null };
    const ok = await run(() => (event ? api.patch(`/events/${event.id}`, body) : api.post('/events', body)));
    if (ok) onDone();
  };

  return (
    <Modal title={event ? 'Compromisso' : 'Novo compromisso'} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <Field label="O quê">
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Fono do Gabriel, reunião da escola" required autoFocus={!event} />
        </Field>
        <div className="grid-2">
          <Field label="Dia">
            <input className="input" type="date" value={d} onChange={(e) => setD(e.target.value)} required />
          </Field>
          <Field label="Hora (opcional)">
            <input className="input" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </Field>
        </div>
        <MemberSelect label="De quem é" value={memberId} onChange={setMemberId} />
        <Field label="Observação">
          <textarea className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <ErrorBox error={error} />
        <div className="modal-actions">
          {event && <ConfirmButton onConfirm={() => run(() => api.del(`/events/${event.id}`)).then((ok) => ok && onDone())}>Excluir</ConfirmButton>}
          <span className="spacer" />
          <button className="btn primary" disabled={busy}>
            Salvar
          </button>
        </div>
      </form>
    </Modal>
  );
}
