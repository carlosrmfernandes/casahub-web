import { useState } from 'react';
import { CardFormModal, PayInvoiceModal, PurchaseFormModal } from '../components/CardModals';
import { IconPlus } from '../components/icons';
import { Avatar, ErrorBox, Loading, MoneyField, Modal, SharedMonthPicker } from '../components/ui';
import { api } from '../lib/api';
import { brl, CATEGORIES, dateShort, daysUntil, dueText, monthLabel } from '../lib/format';
import { useAction, useLoad } from '../lib/hooks';
import { useSession } from '../lib/session';
import type { Card, Invoice, InvoiceItem } from '../lib/types';

export function Cards() {
  const { month } = useSession();
  const { data, error, reload } = useLoad(
    () => Promise.all([api.get<Card[]>('/cards'), api.get<Invoice[]>(`/cards/invoices?month=${month}`)]),
    [month],
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cardModal, setCardModal] = useState<Card | 'new' | null>(null);
  const [purchase, setPurchase] = useState<InvoiceItem | 'new' | null>(null);
  const [paying, setPaying] = useState(false);
  const [fixing, setFixing] = useState(false);
  const action = useAction();

  const done = () => {
    setCardModal(null);
    setPurchase(null);
    setPaying(false);
    setFixing(false);
    reload();
  };

  if (!data) return error ? <ErrorBox error={error} /> : <Loading />;
  const [cards, invoices] = data;

  if (cards.length === 0) {
    return (
      <div className="stack">
        <div className="page-head">
          <h1>Cartões</h1>
        </div>
        <div className="card empty">
          <h2>Nenhum cartão cadastrado</h2>
          <p>Cadastre seu cartão para lançar as compras e as parcelas. Assim você sabe quanto vai vir na fatura antes dela chegar.</p>
          <button className="btn primary" onClick={() => setCardModal('new')}>
            Cadastrar cartão
          </button>
        </div>
        {cardModal && <CardFormModal onClose={() => setCardModal(null)} onDone={done} />}
      </div>
    );
  }

  const card = cards.find((c) => c.id === selectedId) ?? cards[0];
  const invoice = invoices.find((i) => i.cardId === card.id);
  const late = invoice && invoice.status === 'PENDENTE' && invoice.totalCents > 0 && daysUntil(invoice.dueDate) < 0;

  return (
    <div className="stack">
      <div className="page-head">
        <h1>Cartões</h1>
        <SharedMonthPicker />
      </div>

      <div className="card-tabs">
        {cards.map((c) => {
          const inv = invoices.find((i) => i.cardId === c.id);
          return (
            <button key={c.id} className={`card-tab${c.id === card.id ? ' on' : ''}`} style={{ background: c.color }} onClick={() => setSelectedId(c.id)}>
              <div>{c.name}</div>
              <div className="small num">{brl(inv?.totalCents ?? 0)}</div>
            </button>
          );
        })}
        <button className="card-tab" style={{ background: 'var(--surface-2)', color: 'var(--text)' }} onClick={() => setCardModal('new')}>
          + Novo cartão
        </button>
      </div>

      {invoice && (
        <div className="card">
          <div className="row wrap" style={{ justifyContent: 'space-between' }}>
            <div>
              <div className="muted small">Fatura de {monthLabel(month).toLowerCase()}</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 750 }} className="num">
                {brl(invoice.totalCents)}
              </div>
              <div className="small">
                {invoice.status === 'PAGO' ? (
                  <span className="tag ok">Paga {invoice.paidAt && `em ${dateShort(invoice.paidAt)}`}</span>
                ) : (
                  <span className={late ? 'danger-text' : 'muted'}>{dueText(invoice.dueDate)}</span>
                )}
                <span className="muted"> · fecha dia {card.closingDay}</span>
              </div>
              {invoice.overrideCents != null && (
                <div className="small muted">
                  Valor informado por você. Pelas compras daria {brl(invoice.computedCents)}.
                </div>
              )}
            </div>
            <div className="row wrap">
              {invoice.status === 'PAGO' ? (
                <button
                  className="btn"
                  onClick={() => action.run(() => api.post(`/cards/${card.id}/invoices/${month}/unpay`)).then(reload)}
                >
                  Desfazer pagamento
                </button>
              ) : (
                <button className="btn primary" onClick={() => setPaying(true)} disabled={invoice.totalCents === 0}>
                  Paguei a fatura
                </button>
              )}
              <button className="btn" onClick={() => setFixing(true)}>
                Valor real
              </button>
              <button className="btn ghost" onClick={() => setCardModal(card)}>
                Editar cartão
              </button>
            </div>
          </div>
          {card.limitCents ? (
            <div style={{ marginTop: 12 }}>
              <div className="row small muted" style={{ justifyContent: 'space-between', marginBottom: 4 }}>
                <span>Fatura em relação ao limite</span>
                <span>{brl(card.limitCents)}</span>
              </div>
              <div className="progress">
                <div style={{ width: `${Math.min(100, Math.round((invoice.totalCents / card.limitCents) * 100))}%`, background: card.color }} />
              </div>
            </div>
          ) : null}
        </div>
      )}
      <ErrorBox error={action.error} />

      <div className="card flush">
        <div className="card-head">
          <h2>Compras nesta fatura</h2>
          <button className="btn small primary" onClick={() => setPurchase('new')}>
            + Compra
          </button>
        </div>
        {!invoice || invoice.items.length === 0 ? (
          <div className="empty small">Nenhuma compra nesta fatura.</div>
        ) : (
          <div className="list">
            {invoice.items.map((i) => (
              <button key={i.purchaseId} className="item" onClick={() => setPurchase(i)}>
                <span className="dot" style={{ background: CATEGORIES[i.category].color }} />
                <div className="grow">
                  <div className="title">{i.description}</div>
                  <div className="sub">
                    {i.recurring ? (
                      <span className="tag info">assinatura</span>
                    ) : i.installments > 1 ? (
                      <>
                        <span className="tag">
                          parcela {i.installment}/{i.installments}
                        </span>{' '}
                        de {brl(i.totalCents)}
                      </>
                    ) : (
                      <>comprado {dateShort(i.purchaseDate)}</>
                    )}
                  </div>
                </div>
                <Avatar member={i.responsible} />
                <span className="amount num">{brl(i.amountCents)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <button className="fab" onClick={() => setPurchase('new')} aria-label="Nova compra no cartão">
        <IconPlus />
      </button>

      {cardModal && <CardFormModal card={cardModal === 'new' ? undefined : cardModal} onClose={() => setCardModal(null)} onDone={done} />}
      {purchase && (
        <PurchaseFormModal card={card} item={purchase === 'new' ? undefined : purchase} month={month} onClose={() => setPurchase(null)} onDone={done} />
      )}
      {paying && invoice && (
        <PayInvoiceModal
          cardId={card.id}
          month={month}
          name={`fatura ${card.name}`}
          amountCents={invoice.totalCents}
          onClose={() => setPaying(false)}
          onDone={done}
        />
      )}
      {fixing && invoice && <InvoiceAmountModal invoice={invoice} onClose={() => setFixing(false)} onDone={done} />}
    </div>
  );
}

function InvoiceAmountModal({ invoice, onClose, onDone }: { invoice: Invoice; onClose: () => void; onDone: () => void }) {
  const [amount, setAmount] = useState<number | null>(invoice.totalCents);
  const { busy, error, run } = useAction();
  const save = (value: number | null) =>
    run(() => api.put(`/cards/${invoice.cardId}/invoices/${invoice.month}/amount`, { amountCents: value })).then((ok) => ok && onDone());

  return (
    <Modal title="Valor real da fatura" onClose={onClose}>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          save(amount);
        }}
      >
        <p className="small muted" style={{ margin: 0 }}>
          Pelas compras lançadas, a fatura daria {brl(invoice.computedCents)}. Se chegou um valor diferente (juros, compras que você não lançou), coloque aqui.
        </p>
        <MoneyField label="Valor da fatura" value={amount} onChange={setAmount} autoFocus />
        <ErrorBox error={error} />
        <div className="modal-actions">
          {invoice.overrideCents != null && (
            <button type="button" className="btn" onClick={() => save(null)}>
              Usar o valor calculado
            </button>
          )}
          <span className="spacer" />
          <button className="btn primary" disabled={busy}>
            Salvar
          </button>
        </div>
      </form>
    </Modal>
  );
}
