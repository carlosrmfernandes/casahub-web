import { useState } from 'react';
import { api } from '../lib/api';
import { brl, currentMonth, dateShort, monthLabel, todayISO } from '../lib/format';
import { useAction } from '../lib/hooks';
import type { Bill, Category, PaymentMethod, RecurringBill } from '../lib/types';
import { CategorySelect, ConfirmButton, ErrorBox, Field, MemberSelect, MethodSelect, Modal, MoneyField } from './ui';

/** Confirma o pagamento de uma conta (com valor real, data e forma). */
export function PayBillModal({ bill, onClose, onDone }: { bill: Pick<Bill, 'id' | 'name' | 'amountCents' | 'estimated' | 'method'>; onClose: () => void; onDone: () => void }) {
  const [amount, setAmount] = useState<number | null>(bill.amountCents || null);
  const [paidAt, setPaidAt] = useState(todayISO());
  const [method, setMethod] = useState<PaymentMethod | null>(bill.method);
  const { busy, error, setError, run } = useAction();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount == null) return setError('Informe quanto você pagou');
    const ok = await run(() => api.post(`/bills/${bill.id}/pay`, { amountCents: amount, paidAt, method }));
    if (ok) onDone();
  };

  return (
    <Modal title={`Pagar ${bill.name}`} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <MoneyField
          label="Valor pago"
          value={amount}
          onChange={setAmount}
          autoFocus={bill.estimated || !bill.amountCents}
          hint={bill.estimated ? 'O valor era uma estimativa. Coloque o valor real da conta.' : undefined}
        />
        <div className="grid-2">
          <Field label="Data do pagamento">
            <input className="input" type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} required />
          </Field>
          <MethodSelect value={method} onChange={setMethod} />
        </div>
        <ErrorBox error={error} />
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn primary" disabled={busy}>
            {busy ? 'Salvando…' : 'Confirmar pagamento'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/** Nova conta avulsa ou edição de uma conta do mês. */
export function BillFormModal({ bill, month, onClose, onDone }: { bill?: Bill; month: string; onClose: () => void; onDone: () => void }) {
  const defaultDate = month === currentMonth() ? todayISO() : `${month}-10`;
  const [name, setName] = useState(bill?.name ?? '');
  const [amount, setAmount] = useState<number | null>(bill ? bill.amountCents : null);
  const [dueDate, setDueDate] = useState(bill?.dueDate ?? defaultDate);
  const [category, setCategory] = useState<Category>(bill?.category ?? 'OUTROS');
  const [method, setMethod] = useState<PaymentMethod | null>(bill?.method ?? null);
  const [responsibleId, setResponsibleId] = useState<string | null>(bill?.responsibleId ?? null);
  const [notes, setNotes] = useState(bill?.notes ?? '');
  const [paid, setPaid] = useState(false);
  // Conta fixa com valor que não muda: por padrão, o novo valor vale para os próximos meses também.
  const [updateFixed, setUpdateFixed] = useState(!!bill?.recurringBillId && (!bill.estimated || bill.amountCents === 0));
  const { busy, error, setError, run } = useAction();

  const isFixed = !!bill?.recurringBillId;
  const amountChanged = bill && amount !== bill.amountCents;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount == null) return setError('Informe o valor');
    const body = { name, amountCents: amount, dueDate, category, method, responsibleId, notes: notes || null };
    const ok = await run(async () => {
      if (!bill) return api.post('/bills', { ...body, paid });
      await api.patch(`/bills/${bill.id}`, body);
      if (isFixed && updateFixed && amountChanged) {
        await api.patch(`/recurring-bills/${bill.recurringBillId}`, { amountCents: amount });
      }
      return true;
    });
    if (ok) onDone();
  };

  const act = (path: string) => run(() => api.post(path)).then((ok) => ok && onDone());

  return (
    <Modal title={bill ? bill.name : 'Nova conta'} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        {bill && (
          <div className="row wrap">
            {bill.status === 'PAGO' && <span className="tag ok">Paga em {dateShort(bill.paidAt!)}</span>}
            {bill.status === 'PENDENTE' && (bill.overdue ? <span className="tag danger">Atrasada</span> : <span className="tag">A pagar</span>)}
            {bill.status === 'IGNORADA' && <span className="tag">Não teve este mês</span>}
            {isFixed && <span className="tag info">Conta fixa · {monthLabel(bill.month)}</span>}
          </div>
        )}
        <Field label="Nome">
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Dentista, IPVA…" required autoFocus={!bill} />
        </Field>
        <div className="grid-2">
          <MoneyField label="Valor" value={amount} onChange={setAmount} />
          <Field label="Vencimento">
            <input className="input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
          </Field>
        </div>
        {isFixed && amountChanged && (
          <label className="toggle">
            <input type="checkbox" checked={updateFixed} onChange={(e) => setUpdateFixed(e.target.checked)} />
            Usar esse valor nos próximos meses também
          </label>
        )}
        <div className="grid-2">
          <CategorySelect value={category} onChange={setCategory} />
          <MethodSelect value={method} onChange={setMethod} />
        </div>
        <MemberSelect value={responsibleId} onChange={setResponsibleId} />
        <Field label="Observação">
          <textarea className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Código de barras, chave Pix…" />
        </Field>
        {!bill && (
          <label className="toggle">
            <input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} />
            Já está paga
          </label>
        )}
        <ErrorBox error={error} />
        <div className="modal-actions">
          {bill?.status === 'PAGO' && (
            <button type="button" className="btn" onClick={() => act(`/bills/${bill.id}/unpay`)}>
              Desfazer pagamento
            </button>
          )}
          {bill?.status === 'IGNORADA' && (
            <button type="button" className="btn" onClick={() => act(`/bills/${bill.id}/unpay`)}>
              Voltar a cobrar
            </button>
          )}
          {bill?.status === 'PENDENTE' && isFixed && (
            <button type="button" className="btn" onClick={() => act(`/bills/${bill.id}/skip`)}>
              Não teve este mês
            </button>
          )}
          {bill && !isFixed && (
            <ConfirmButton onConfirm={() => run(() => api.del(`/bills/${bill.id}`)).then((ok) => ok && onDone())}>Excluir</ConfirmButton>
          )}
          <span className="spacer" />
          <button className="btn primary" disabled={busy}>
            {busy ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/** Conta fixa: se repete todo mês (com mês final opcional). */
export function RecurringFormModal({ item, onClose, onDone }: { item?: RecurringBill; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState(item?.name ?? '');
  const [amount, setAmount] = useState<number | null>(item ? item.amountCents : null);
  const [variable, setVariable] = useState(item?.variable ?? false);
  const [dueDay, setDueDay] = useState(item?.dueDay ?? 10);
  const [startMonth, setStartMonth] = useState(item?.startMonth ?? currentMonth());
  const [hasEnd, setHasEnd] = useState(!!item?.endMonth);
  const [endMonth, setEndMonth] = useState(item?.endMonth ?? '');
  const [category, setCategory] = useState<Category>(item?.category ?? 'OUTROS');
  const [method, setMethod] = useState<PaymentMethod | null>(item?.method ?? null);
  const [responsibleId, setResponsibleId] = useState<string | null>(item?.responsibleId ?? null);
  const [active, setActive] = useState(item?.active ?? true);
  const { busy, error, setError, run } = useAction();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount == null && !variable) return setError('Informe o valor');
    if (hasEnd && !endMonth) return setError('Informe até quando vai essa conta');
    const body = {
      name,
      amountCents: amount ?? 0,
      variable,
      dueDay,
      startMonth,
      endMonth: hasEnd ? endMonth : null,
      category,
      method,
      responsibleId,
      active,
    };
    const ok = await run(() => (item ? api.patch(`/recurring-bills/${item.id}`, body) : api.post('/recurring-bills', body)));
    if (ok) onDone();
  };

  return (
    <Modal title={item ? 'Editar conta fixa' : 'Nova conta fixa'} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <Field label="Nome">
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Aluguel, Luz, Escola…" required autoFocus={!item} />
        </Field>
        <div className="grid-2">
          <MoneyField label={variable ? 'Valor médio' : 'Valor'} value={amount} onChange={setAmount} />
          <Field label="Dia do vencimento">
            <input className="input" type="number" min={1} max={31} value={dueDay} onChange={(e) => setDueDay(Number(e.target.value))} required />
          </Field>
        </div>
        <label className="toggle">
          <input type="checkbox" checked={variable} onChange={(e) => setVariable(e.target.checked)} />
          O valor muda todo mês (água, luz…)
        </label>
        <div className="grid-2">
          <Field label="Começa em">
            <input className="input" type="month" value={startMonth} onChange={(e) => setStartMonth(e.target.value)} required />
          </Field>
          <Field label="Termina em">
            {hasEnd ? (
              <input className="input" type="month" value={endMonth} min={startMonth} onChange={(e) => setEndMonth(e.target.value)} />
            ) : (
              <button type="button" className="btn" onClick={() => setHasEnd(true)}>
                Sem fim · definir
              </button>
            )}
          </Field>
        </div>
        {hasEnd && (
          <button type="button" className="btn ghost small" style={{ justifySelf: 'start' }} onClick={() => setHasEnd(false)}>
            Não tem data para acabar
          </button>
        )}
        <div className="grid-2">
          <CategorySelect value={category} onChange={setCategory} />
          <MethodSelect value={method} onChange={setMethod} />
        </div>
        <MemberSelect value={responsibleId} onChange={setResponsibleId} />
        {item && (
          <label className="toggle">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            Ativa (desmarque para pausar)
          </label>
        )}
        {item && amount != null && amount !== item.amountCents && (
          <p className="small muted" style={{ margin: 0 }}>
            O novo valor ({brl(amount)}) vale para as contas ainda não pagas deste mês em diante.
          </p>
        )}
        <ErrorBox error={error} />
        <div className="modal-actions">
          {item && (
            <ConfirmButton onConfirm={() => run(() => api.del(`/recurring-bills/${item.id}`)).then((ok) => ok && onDone())}>Excluir</ConfirmButton>
          )}
          <span className="spacer" />
          <button className="btn primary" disabled={busy}>
            {busy ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
