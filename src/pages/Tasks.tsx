import { useState } from 'react';
import { IconRepeat } from '../components/icons';
import { Avatar, Check, ConfirmButton, ErrorBox, Field, Loading, MemberSelect, Modal } from '../components/ui';
import { api } from '../lib/api';
import { dateShort, daysUntil, weekday } from '../lib/format';
import { useAction, useLoad } from '../lib/hooks';
import { useSession } from '../lib/session';
import type { Task } from '../lib/types';

const RECURRENCE: Record<Task['recurrence'], string> = { NONE: 'Não repete', DAILY: 'Todo dia', WEEKLY: 'Toda semana', MONTHLY: 'Todo mês' };

function group(t: Task) {
  if (!t.dueDate) return 'Sem data';
  const d = daysUntil(t.dueDate);
  if (d < 0) return 'Atrasadas';
  if (d === 0) return 'Hoje';
  if (d <= 7) return 'Próximos 7 dias';
  return 'Mais para frente';
}
const ORDER = ['Atrasadas', 'Hoje', 'Próximos 7 dias', 'Mais para frente', 'Sem data'];

export function Tasks() {
  const { members } = useSession();
  const { data, error, reload, setData } = useLoad(() => api.get<Task[]>('/tasks'), []);
  const [title, setTitle] = useState('');
  const [who, setWho] = useState<string>('todos');
  const [editing, setEditing] = useState<Task | null>(null);
  const [showDone, setShowDone] = useState(false);
  const action = useAction();

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const ok = await action.run(() => api.post('/tasks', { title, assigneeId: who !== 'todos' ? who : null }));
    if (ok) {
      setTitle('');
      reload();
    }
  };

  const toggle = async (t: Task) => {
    const updated = await action.run(() => api.post<Task>(`/tasks/${t.id}/toggle`));
    if (updated) setData((list) => list && list.map((x) => (x.id === t.id ? updated : x)));
  };

  if (!data) return error ? <ErrorBox error={error} /> : <Loading />;
  const mine = data.filter((t) => who === 'todos' || t.assigneeId === who);
  const open = mine.filter((t) => !t.done);
  const done = mine.filter((t) => t.done);
  const groups = ORDER.map((g) => ({ g, items: open.filter((t) => group(t) === g) })).filter((x) => x.items.length);

  return (
    <div className="stack">
      <div className="page-head">
        <h1>Tarefas</h1>
      </div>
      {members.length > 1 && (
        <div className="chips">
          <button className={`chip${who === 'todos' ? ' on' : ''}`} onClick={() => setWho('todos')}>
            Todos
          </button>
          {members.map((m) => (
            <button key={m.id} className={`chip${who === m.id ? ' on' : ''}`} onClick={() => setWho(m.id)}>
              {m.name.split(' ')[0]}
            </button>
          ))}
        </div>
      )}
      <form className="quick-add" onSubmit={add}>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nova tarefa (ex: levar o lixo, pagar a escola)" />
        <button className="btn primary" disabled={action.busy}>
          Adicionar
        </button>
      </form>
      <ErrorBox error={action.error} />

      {groups.length === 0 && <div className="card empty">Nenhuma tarefa pendente.</div>}
      {groups.map(({ g, items }) => (
        <div key={g} className="card flush">
          <div className="card-head">
            <h2 className={g === 'Atrasadas' ? 'danger-text' : ''}>{g}</h2>
          </div>
          <div className="list">
            {items.map((t) => (
              <TaskRow key={t.id} t={t} onToggle={() => toggle(t)} onOpen={() => setEditing(t)} />
            ))}
          </div>
        </div>
      ))}

      {done.length > 0 && (
        <div className="card flush">
          <button className="item" onClick={() => setShowDone((v) => !v)}>
            <span className="grow">
              <b>Concluídas ({done.length})</b>
            </span>
            <span className="muted small">{showDone ? 'esconder' : 'mostrar'}</span>
          </button>
          {showDone && (
            <div className="list">
              {done.map((t) => (
                <TaskRow key={t.id} t={t} onToggle={() => toggle(t)} onOpen={() => setEditing(t)} />
              ))}
            </div>
          )}
        </div>
      )}

      {editing && (
        <TaskModal
          task={editing}
          onClose={() => setEditing(null)}
          onDone={() => {
            setEditing(null);
            reload();
          }}
        />
      )}
    </div>
  );
}

function TaskRow({ t, onToggle, onOpen }: { t: Task; onToggle: () => void; onOpen: () => void }) {
  return (
    <div role="button" tabIndex={0} className={`item${t.done ? ' done' : ''}`} onClick={onOpen} onKeyDown={(e) => e.key === 'Enter' && onOpen()}>
      <Check on={t.done} late={t.overdue} onClick={onToggle} label={t.done ? 'Reabrir tarefa' : 'Concluir tarefa'} />
      <div className="grow">
        <div className="title">{t.title}</div>
        {(t.dueDate || t.recurrence !== 'NONE') && (
          <div className={`sub row ${t.overdue ? 'danger-text' : ''}`} style={{ gap: 4 }}>
            {t.dueDate && `${weekday(t.dueDate)}, ${dateShort(t.dueDate)}`}
            {t.recurrence !== 'NONE' && (
              <>
                <IconRepeat /> {RECURRENCE[t.recurrence].toLowerCase()}
              </>
            )}
          </div>
        )}
      </div>
      <Avatar member={t.assignee} />
    </div>
  );
}

function TaskModal({ task, onClose, onDone }: { task: Task; onClose: () => void; onDone: () => void }) {
  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes ?? '');
  const [assigneeId, setAssigneeId] = useState(task.assigneeId);
  const [dueDate, setDueDate] = useState(task.dueDate ?? '');
  const [recurrence, setRecurrence] = useState(task.recurrence);
  const { busy, error, setError, run } = useAction();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (recurrence !== 'NONE' && !dueDate) return setError('Tarefas que se repetem precisam de uma data');
    const ok = await run(() => api.patch(`/tasks/${task.id}`, { title, notes: notes || null, assigneeId, dueDate: dueDate || null, recurrence }));
    if (ok) onDone();
  };

  return (
    <Modal title="Tarefa" onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <Field label="O que fazer">
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </Field>
        <div className="grid-2">
          <Field label="Quando">
            <input className="input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </Field>
          <Field label="Repete">
            <select className="select" value={recurrence} onChange={(e) => setRecurrence(e.target.value as Task['recurrence'])}>
              {Object.entries(RECURRENCE).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <MemberSelect label="Quem faz" value={assigneeId} onChange={setAssigneeId} />
        <Field label="Detalhes">
          <textarea className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <ErrorBox error={error} />
        <div className="modal-actions">
          <ConfirmButton onConfirm={() => run(() => api.del(`/tasks/${task.id}`)).then((ok) => ok && onDone())}>Excluir</ConfirmButton>
          <span className="spacer" />
          <button className="btn primary" disabled={busy}>
            Salvar
          </button>
        </div>
      </form>
    </Modal>
  );
}
