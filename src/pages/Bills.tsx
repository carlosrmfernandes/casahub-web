import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { BillFormModal, PayBillModal, RecurringFormModal } from '../components/BillModals';
import { PayInvoiceModal } from '../components/CardModals';
import { IconPlus, IconRepeat } from '../components/icons';
import { Avatar, Check, ErrorBox, Loading, SharedMonthPicker } from '../components/ui';
import { api } from '../lib/api';
import { brl, CATEGORIES, dateShort, daysUntil, dueText, METHODS, monthLabel, monthShort } from '../lib/format';
import { useAction, useLoad } from '../lib/hooks';
import { useSession } from '../lib/session';
import type { Bill, Invoice, RecurringBill } from '../lib/types';
import { StarterBills } from './StarterBills';

export function Bills() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('aba') === 'fixas' ? 'fixas' : 'mes';

  return (
    <div className="stack">
      <div className="page-head">
        <h1>Contas</h1>
        <div className="segmented">
          <button className={tab === 'mes' ? 'on' : ''} onClick={() => setParams({})}>
            Do mês
          </button>
          <button className={tab === 'fixas' ? 'on' : ''} onClick={() => setParams({ aba: 'fixas' })}>
            Contas fixas
          </button>
        </div>
      </div>
      {tab === 'mes' ? <MonthBills /> : <RecurringBills />}
    </div>
  );
}

type Filter = 'todas' | 'pagar' | 'pagas';

function MonthBills() {
  const { month } = useSession();
  const { data, error, reload } = useLoad(
    () => Promise.all([api.get<Bill[]>(`/bills?month=${month}`), api.get<Invoice[]>(`/cards/invoices?month=${month}`)]),
    [month],
  );
  const [filter, setFilter] = useState<Filter>('todas');
  const [editing, setEditing] = useState<Bill | 'new' | null>(null);
  const [paying, setPaying] = useState<Bill | null>(null);
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);
  const action = useAction();
  const navigate = useNavigate();

  const done = () => {
    setEditing(null);
    setPaying(null);
    setPayingInvoice(null);
    reload();
  };

  const toggle = async (b: Bill) => {
    if (b.status === 'PAGO') {
      await action.run(() => api.post(`/bills/${b.id}/unpay`));
      reload();
    } else setPaying(b);
  };

  const toggleInvoice = async (i: Invoice) => {
    if (i.status === 'PAGO') {
      await action.run(() => api.post(`/cards/${i.cardId}/invoices/${i.month}/unpay`));
      reload();
    } else setPayingInvoice(i);
  };

  if (!data) return error ? <ErrorBox error={error} /> : <Loading />;
  const [bills, allInvoices] = data;
  const invoices = allInvoices.filter((i) => i.totalCents > 0 || i.status === 'PAGO');
  const counted = bills.filter((b) => b.status !== 'IGNORADA');
  const total = counted.reduce((s, b) => s + b.amountCents, 0) + invoices.reduce((s, i) => s + i.totalCents, 0);
  const paid =
    counted.filter((b) => b.status === 'PAGO').reduce((s, b) => s + b.amountCents, 0) +
    invoices.filter((i) => i.status === 'PAGO').reduce((s, i) => s + i.totalCents, 0);

  const visibleBills = bills.filter((b) => (filter === 'todas' ? true : filter === 'pagas' ? b.status === 'PAGO' : b.status === 'PENDENTE'));
  const visibleInvoices = invoices.filter((i) => (filter === 'todas' ? true : filter === 'pagas' ? i.status === 'PAGO' : i.status === 'PENDENTE'));
  const noValue = bills.filter((b) => b.status === 'PENDENTE' && (b.estimated || b.amountCents === 0));

  return (
    <>
      <div className="row wrap" style={{ justifyContent: 'space-between' }}>
        <SharedMonthPicker />
        <div className="chips">
          {(['todas', 'pagar', 'pagas'] as Filter[]).map((f) => (
            <button key={f} className={`chip${filter === f ? ' on' : ''}`} onClick={() => setFilter(f)}>
              {f === 'todas' ? 'Todas' : f === 'pagar' ? 'A pagar' : 'Pagas'}
            </button>
          ))}
        </div>
      </div>

      <div className="stats three">
        <div className="card stat">
          <div className="label">Total</div>
          <div className="value num">{brl(total)}</div>
        </div>
        <div className="card stat">
          <div className="label">Pago</div>
          <div className="value num ok-text">{brl(paid)}</div>
        </div>
        <div className="card stat">
          <div className="label">Falta</div>
          <div className={`value num ${total - paid > 0 ? 'warn-text' : ''}`}>{brl(total - paid)}</div>
        </div>
      </div>

      {noValue.length > 0 && (
        <div className="alert warn">
          <p className="small">
            <b>{noValue.map((b) => b.name).join(', ')}</b>: {noValue.length === 1 ? 'está' : 'estão'} sem o valor certo. Toque na conta para informar quando chegar o
            boleto.
          </p>
        </div>
      )}
      <ErrorBox error={action.error} />

      <div className="card flush">
        {bills.length === 0 && invoices.length === 0 ? (
          <div className="empty">
            <h2>Nenhuma conta em {monthLabel(month, false).toLowerCase()}</h2>
            <p>
              Cadastre suas <Link to="/contas?aba=fixas">contas fixas</Link> e elas aparecem aqui todo mês.
            </p>
          </div>
        ) : (
          <div className="list">
            {visibleBills.map((b) => (
              <div
                key={b.id}
                role="button"
                tabIndex={0}
                className={`item${b.status === 'PAGO' ? ' done' : ''}${b.status === 'IGNORADA' ? ' dim' : ''}`}
                onClick={() => setEditing(b)}
                onKeyDown={(e) => e.key === 'Enter' && setEditing(b)}
              >
                {b.status === 'IGNORADA' ? (
                  <span className="check" aria-hidden />
                ) : (
                  <Check on={b.status === 'PAGO'} late={b.overdue} onClick={() => toggle(b)} label={b.status === 'PAGO' ? 'Desfazer pagamento' : 'Marcar como paga'} />
                )}
                <div className="grow">
                  <div className="title">
                    {b.name} {b.recurringBillId && <IconRepeat className="muted" aria-label="conta fixa" />}
                  </div>
                  <div className="sub row wrap" style={{ gap: 6 }}>
                    <span className="dot" style={{ background: CATEGORIES[b.category].color }} />
                    {b.status === 'PAGO' ? (
                      <span className="ok-text">paga {dateShort(b.paidAt!)}{b.method ? ` · ${METHODS[b.method]}` : ''}</span>
                    ) : b.status === 'IGNORADA' ? (
                      <span>não teve este mês</span>
                    ) : (
                      <span className={b.overdue ? 'danger-text' : ''}>{dueText(b.dueDate)}</span>
                    )}
                    {b.status === 'PENDENTE' && b.estimated && b.amountCents > 0 && <span className="tag warn">estimado</span>}
                  </div>
                </div>
                <Avatar member={b.responsible} />
                <span className="amount num">{b.amountCents ? brl(b.amountCents) : <span className="tag warn">informar</span>}</span>
              </div>
            ))}
            {visibleInvoices.map((i) => {
              const late = i.status === 'PENDENTE' && daysUntil(i.dueDate) < 0;
              return (
                <div
                  key={i.cardId}
                  role="button"
                  tabIndex={0}
                  className={`item${i.status === 'PAGO' ? ' done' : ''}`}
                  onClick={() => navigate('/cartoes')}
                  onKeyDown={(e) => e.key === 'Enter' && navigate('/cartoes')}
                >
                  <Check on={i.status === 'PAGO'} late={late} onClick={() => toggleInvoice(i)} label="Marcar fatura como paga" />
                  <div className="grow">
                    <div className="title">Fatura {i.cardName}</div>
                    <div className="sub row" style={{ gap: 6 }}>
                      <span className="dot" style={{ background: i.color }} />
                      {i.status === 'PAGO' ? (
                        <span className="ok-text">paga {i.paidAt && dateShort(i.paidAt)}</span>
                      ) : (
                        <span className={late ? 'danger-text' : ''}>{dueText(i.dueDate)}</span>
                      )}
                      <span>· {i.items.length} compra(s)</span>
                    </div>
                  </div>
                  <span className="amount num">{brl(i.totalCents)}</span>
                </div>
              );
            })}
            {visibleBills.length + visibleInvoices.length === 0 && <div className="empty small">Nada aqui com esse filtro.</div>}
          </div>
        )}
      </div>

      <button className="fab" onClick={() => setEditing('new')} aria-label="Nova conta avulsa">
        <IconPlus />
      </button>
      <p className="small muted" style={{ margin: 0 }}>
        O botão <b>+</b> cria uma conta que só acontece uma vez (ex: dentista, IPVA). Contas que se repetem ficam em <Link to="/contas?aba=fixas">Contas fixas</Link>.
      </p>

      {editing && <BillFormModal bill={editing === 'new' ? undefined : editing} month={month} onClose={() => setEditing(null)} onDone={done} />}
      {paying && <PayBillModal bill={paying} onClose={() => setPaying(null)} onDone={done} />}
      {payingInvoice && (
        <PayInvoiceModal
          cardId={payingInvoice.cardId}
          month={payingInvoice.month}
          name={`Fatura ${payingInvoice.cardName}`}
          amountCents={payingInvoice.totalCents}
          onClose={() => setPayingInvoice(null)}
          onDone={done}
        />
      )}
    </>
  );
}

function RecurringBills() {
  const { data, error, reload } = useLoad(() => api.get<RecurringBill[]>('/recurring-bills'), []);
  const [editing, setEditing] = useState<RecurringBill | 'new' | null>(null);

  const done = () => {
    setEditing(null);
    reload();
  };

  if (!data) return error ? <ErrorBox error={error} /> : <Loading />;
  if (data.length === 0) return <StarterBills onDone={reload} onCustom={() => setEditing('new')} extra={editing && <RecurringFormModal onClose={() => setEditing(null)} onDone={done} />} />;

  const active = data.filter((r) => r.active);
  const monthly = active.reduce((s, r) => s + r.amountCents, 0);

  return (
    <>
      <div className="card">
        <div className="muted small">Contas fixas ativas</div>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <b style={{ fontSize: '1.3rem' }} className="num">
            {brl(monthly)} / mês
          </b>
          <span className="muted small">{active.length} contas</span>
        </div>
        <p className="small muted" style={{ margin: '6px 0 0' }}>
          Contas de valor variável entram com o último valor pago.
        </p>
      </div>
      <div className="card flush">
        <div className="list">
          {data.map((r) => (
            <button key={r.id} className={`item${r.active ? '' : ' dim'}`} onClick={() => setEditing(r)}>
              <span className="dot" style={{ background: CATEGORIES[r.category].color, width: 12, height: 12 }} />
              <div className="grow">
                <div className="title">{r.name}</div>
                <div className="sub">
                  todo dia {r.dueDay}
                  {r.endMonth ? ` · até ${monthShort(r.endMonth)}` : ''}
                  {!r.active && ' · pausada'}
                  {r.variable && ' · valor varia'}
                </div>
              </div>
              <Avatar member={r.responsible} />
              <span className="amount num">{r.amountCents ? brl(r.amountCents) : <span className="tag warn">sem valor</span>}</span>
            </button>
          ))}
        </div>
      </div>
      <button className="fab" onClick={() => setEditing('new')} aria-label="Nova conta fixa">
        <IconPlus />
      </button>
      {editing && <RecurringFormModal item={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} onDone={done} />}
    </>
  );
}
