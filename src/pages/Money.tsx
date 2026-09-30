import { useState } from 'react';
import { ConfirmButton, ErrorBox, Field, Loading, Modal, MoneyField } from '../components/ui';
import { api } from '../lib/api';
import { brl, currentMonth, dateShort, monthShort, todayISO } from '../lib/format';
import { useAction, useLoad } from '../lib/hooks';
import { useSession } from '../lib/session';
import type { Income, Reserve } from '../lib/types';

export function Money() {
  const { month } = useSession();
  const incomes = useLoad(() => api.get<Income[]>('/incomes'), []);
  const reserves = useLoad(() => api.get<Reserve[]>('/reserves'), []);
  const [incomeModal, setIncomeModal] = useState<Income | 'new' | null>(null);
  const [reserveModal, setReserveModal] = useState<Reserve | 'new' | null>(null);
  const [moving, setMoving] = useState<{ reserve: Reserve; type: 'DEPOSITO' | 'RETIRADA' } | null>(null);

  const inMonth = (i: Income) => (i.recurring ? i.startMonth <= month && (!i.endMonth || i.endMonth >= month) : i.startMonth === month);
  const monthTotal = (incomes.data ?? []).filter(inMonth).reduce((s, i) => s + i.amountCents, 0);

  return (
    <div className="stack">
      <div className="page-head">
        <h1>Entradas e reservas</h1>
      </div>

      <div className="card flush">
        <div className="card-head">
          <div>
            <h2>O que entra</h2>
            <div className="small muted">
              Em {monthShort(month)}: <b className="num ok-text">{brl(monthTotal)}</b>
            </div>
          </div>
          <button className="btn small primary" onClick={() => setIncomeModal('new')}>
            + Entrada
          </button>
        </div>
        <ErrorBox error={incomes.error} />
        {!incomes.data ? (
          <Loading />
        ) : incomes.data.length === 0 ? (
          <div className="empty small">
            Cadastre seu salário e outras entradas (pensão, aluguel, bicos…). É assim que o app calcula quanto sobra no mês.
          </div>
        ) : (
          <div className="list">
            {incomes.data.map((i) => (
              <button key={i.id} className={`item${inMonth(i) ? '' : ' dim'}`} onClick={() => setIncomeModal(i)}>
                <div className="grow">
                  <div className="title">{i.name}</div>
                  <div className="sub">
                    {i.recurring ? 'todo mês' : `só em ${monthShort(i.startMonth)}`}
                    {i.day ? ` · dia ${i.day}` : ''}
                    {i.recurring && i.endMonth ? ` · até ${monthShort(i.endMonth)}` : ''}
                  </div>
                </div>
                <span className="amount num ok-text">{brl(i.amountCents)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="card flush">
        <div className="card-head">
          <div>
            <h2>Reservas</h2>
            <div className="small muted">Dinheiro guardado para emergências ou objetivos</div>
          </div>
          <button className="btn small" onClick={() => setReserveModal('new')}>
            + Reserva
          </button>
        </div>
        <ErrorBox error={reserves.error} />
        {!reserves.data ? (
          <Loading />
        ) : reserves.data.length === 0 ? (
          <div className="empty small">Crie uma reserva (ex: "Emergência", "Férias") e vá guardando um pouco todo mês.</div>
        ) : (
          <div className="list">
            {reserves.data.map((r) => {
              const pct = r.goalCents ? Math.min(100, Math.round((r.balanceCents / r.goalCents) * 100)) : null;
              return (
                <div key={r.id} className="item" style={{ cursor: 'default', flexWrap: 'wrap' }}>
                  <div className="grow" style={{ minWidth: 180 }}>
                    <button className="btn ghost small" style={{ padding: 0, height: 'auto' }} onClick={() => setReserveModal(r)}>
                      <span className="title">{r.name}</span>
                    </button>
                    <div className="sub">
                      <b className="num" style={{ color: 'var(--text)' }}>{brl(r.balanceCents)}</b>
                      {r.goalCents ? ` de ${brl(r.goalCents)} (${pct}%)` : ''}
                    </div>
                    {pct != null && (
                      <div className="progress" style={{ marginTop: 6 }}>
                        <div style={{ width: `${pct}%` }} />
                      </div>
                    )}
                  </div>
                  <div className="row">
                    <button className="btn small" onClick={() => setMoving({ reserve: r, type: 'DEPOSITO' })}>
                      Guardar
                    </button>
                    <button className="btn small" onClick={() => setMoving({ reserve: r, type: 'RETIRADA' })} disabled={r.balanceCents === 0}>
                      Retirar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {incomeModal && (
        <IncomeModal
          item={incomeModal === 'new' ? undefined : incomeModal}
          onClose={() => setIncomeModal(null)}
          onDone={() => {
            setIncomeModal(null);
            incomes.reload();
          }}
        />
      )}
      {reserveModal && (
        <ReserveModal
          item={reserveModal === 'new' ? undefined : reserveModal}
          onClose={() => setReserveModal(null)}
          onDone={() => {
            setReserveModal(null);
            reserves.reload();
          }}
        />
      )}
      {moving && (
        <MovementModal
          {...moving}
          onClose={() => setMoving(null)}
          onDone={() => {
            setMoving(null);
            reserves.reload();
          }}
        />
      )}
    </div>
  );
}

function IncomeModal({ item, onClose, onDone }: { item?: Income; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState(item?.name ?? '');
  const [amount, setAmount] = useState<number | null>(item?.amountCents ?? null);
  const [day, setDay] = useState<string>(item?.day ? String(item.day) : '');
  const [recurring, setRecurring] = useState(item?.recurring ?? true);
  const [startMonth, setStartMonth] = useState(item?.startMonth ?? currentMonth());
  const [endMonth, setEndMonth] = useState(item?.endMonth ?? '');
  const { busy, error, setError, run } = useAction();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount == null) return setError('Informe o valor');
    const body = { name, amountCents: amount, day: day ? Number(day) : null, recurring, startMonth, endMonth: recurring && endMonth ? endMonth : null };
    const ok = await run(() => (item ? api.patch(`/incomes/${item.id}`, body) : api.post('/incomes', body)));
    if (ok) onDone();
  };

  return (
    <Modal title={item ? 'Editar entrada' : 'Nova entrada'} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <div className="segmented">
          <button type="button" className={recurring ? 'on' : ''} onClick={() => setRecurring(true)}>
            Todo mês
          </button>
          <button type="button" className={!recurring ? 'on' : ''} onClick={() => setRecurring(false)}>
            Só uma vez
          </button>
        </div>
        <Field label="De onde vem">
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Salário Carlos, 13º, Freela" required autoFocus={!item} />
        </Field>
        <div className="grid-2">
          <MoneyField label="Valor" value={amount} onChange={setAmount} />
          <Field label="Dia que cai (opcional)">
            <input className="input" type="number" min={1} max={31} value={day} onChange={(e) => setDay(e.target.value)} />
          </Field>
        </div>
        <div className="grid-2">
          <Field label={recurring ? 'A partir de' : 'Mês'}>
            <input className="input" type="month" value={startMonth} onChange={(e) => setStartMonth(e.target.value)} required />
          </Field>
          {recurring && (
            <Field label="Até (opcional)">
              <input className="input" type="month" value={endMonth} min={startMonth} onChange={(e) => setEndMonth(e.target.value)} />
            </Field>
          )}
        </div>
        <ErrorBox error={error} />
        <div className="modal-actions">
          {item && <ConfirmButton onConfirm={() => run(() => api.del(`/incomes/${item.id}`)).then((ok) => ok && onDone())}>Excluir</ConfirmButton>}
          <span className="spacer" />
          <button className="btn primary" disabled={busy}>
            {busy ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ReserveModal({ item, onClose, onDone }: { item?: Reserve; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState(item?.name ?? '');
  const [goal, setGoal] = useState<number | null>(item?.goalCents ?? null);
  const { busy, error, run } = useAction();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = { name, goalCents: goal };
    const ok = await run(() => (item ? api.patch(`/reserves/${item.id}`, body) : api.post('/reserves', body)));
    if (ok) onDone();
  };

  return (
    <Modal title={item ? item.name : 'Nova reserva'} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <Field label="Nome">
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Emergência, Férias" required autoFocus={!item} />
        </Field>
        <MoneyField label="Meta (opcional)" value={goal} onChange={setGoal} />
        {item && item.movements.length > 0 && (
          <div>
            <div className="small muted" style={{ marginBottom: 6 }}>
              Histórico
            </div>
            <div className="card flush">
              <div className="list">
                {item.movements.slice(0, 20).map((m) => (
                  <div key={m.id} className="item" style={{ cursor: 'default', padding: '8px 12px' }}>
                    <div className="grow">
                      <div className="small">{m.note || (m.type === 'DEPOSITO' ? 'Guardado' : 'Retirado')}</div>
                      <div className="sub">{dateShort(m.date)}</div>
                    </div>
                    <span className={`num small ${m.type === 'DEPOSITO' ? 'ok-text' : 'danger-text'}`}>
                      {m.type === 'DEPOSITO' ? '+' : '−'} {brl(m.amountCents)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        <ErrorBox error={error} />
        <div className="modal-actions">
          {item && <ConfirmButton onConfirm={() => run(() => api.del(`/reserves/${item.id}`)).then((ok) => ok && onDone())}>Excluir reserva</ConfirmButton>}
          <span className="spacer" />
          <button className="btn primary" disabled={busy}>
            Salvar
          </button>
        </div>
      </form>
    </Modal>
  );
}

function MovementModal({ reserve, type, onClose, onDone }: { reserve: Reserve; type: 'DEPOSITO' | 'RETIRADA'; onClose: () => void; onDone: () => void }) {
  const [amount, setAmount] = useState<number | null>(null);
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState('');
  const { busy, error, setError, run } = useAction();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return setError('Informe o valor');
    const ok = await run(() => api.post(`/reserves/${reserve.id}/movements`, { type, amountCents: amount, date, note: note || null }));
    if (ok) onDone();
  };

  return (
    <Modal title={type === 'DEPOSITO' ? `Guardar em ${reserve.name}` : `Retirar de ${reserve.name}`} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <MoneyField label="Valor" value={amount} onChange={setAmount} autoFocus hint={type === 'RETIRADA' ? `Saldo: ${brl(reserve.balanceCents)}` : undefined} />
        <div className="grid-2">
          <Field label="Data">
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </Field>
          <Field label="Observação">
            <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Opcional" />
          </Field>
        </div>
        <ErrorBox error={error} />
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn primary" disabled={busy}>
            Confirmar
          </button>
        </div>
      </form>
    </Modal>
  );
}
