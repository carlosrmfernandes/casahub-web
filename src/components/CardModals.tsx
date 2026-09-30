import { useState } from 'react';
import { api } from '../lib/api';
import { brl, todayISO } from '../lib/format';
import { useAction } from '../lib/hooks';
import type { Card, Category, InvoiceItem } from '../lib/types';
import { CategorySelect, ConfirmButton, ErrorBox, Field, MemberSelect, Modal, MoneyField } from './ui';

const CARD_COLORS = ['#7c3aed', '#820ad1', '#ec7000', '#cc092f', '#0f766e', '#1d4ed8', '#111827', '#ea580c', '#16a34a'];

export function PayInvoiceModal({
  cardId,
  month,
  name,
  amountCents,
  onClose,
  onDone,
}: {
  cardId: string;
  month: string;
  name: string;
  amountCents: number;
  onClose: () => void;
  onDone: () => void;
}) {
  const [amount, setAmount] = useState<number | null>(amountCents);
  const [paidAt, setPaidAt] = useState(todayISO());
  const { busy, error, setError, run } = useAction();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount == null) return setError('Informe quanto você pagou');
    const body = { paidAt, ...(amount !== amountCents ? { amountCents: amount } : {}) };
    const ok = await run(() => api.post(`/cards/${cardId}/invoices/${month}/pay`, body));
    if (ok) onDone();
  };

  return (
    <Modal title={`Pagar ${name}`} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <MoneyField label="Valor pago" value={amount} onChange={setAmount} hint="Se o valor da fatura veio diferente do calculado, coloque o valor real." />
        <Field label="Data do pagamento">
          <input className="input" type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} required />
        </Field>
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

export function CardFormModal({ card, onClose, onDone }: { card?: Card; onClose: () => void; onDone: (c?: Card) => void }) {
  const [name, setName] = useState(card?.name ?? '');
  const [closingDay, setClosingDay] = useState(card?.closingDay ?? 1);
  const [dueDay, setDueDay] = useState(card?.dueDay ?? 10);
  const [limit, setLimit] = useState<number | null>(card?.limitCents ?? null);
  const [color, setColor] = useState(card?.color ?? '#7c3aed');
  const { busy, error, run } = useAction();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = { name, closingDay, dueDay, limitCents: limit, color };
    const saved = await run(() => (card ? api.patch<Card>(`/cards/${card.id}`, body) : api.post<Card>('/cards', body)));
    if (saved) onDone(saved);
  };

  return (
    <Modal title={card ? 'Editar cartão' : 'Novo cartão'} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <Field label="Nome do cartão">
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Nubank, Itaú…" required autoFocus />
        </Field>
        <div className="grid-2">
          <Field label="Dia que fecha" hint="Compras a partir desse dia vão para a próxima fatura">
            <input className="input" type="number" min={1} max={31} value={closingDay} onChange={(e) => setClosingDay(Number(e.target.value))} required />
          </Field>
          <Field label="Dia que vence">
            <input className="input" type="number" min={1} max={31} value={dueDay} onChange={(e) => setDueDay(Number(e.target.value))} required />
          </Field>
        </div>
        <MoneyField label="Limite (opcional)" value={limit} onChange={setLimit} />
        <Field label="Cor">
          <div className="row wrap">
            {CARD_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={`Cor ${c}`}
                style={{ width: 32, height: 32, borderRadius: 10, background: c, border: color === c ? '3px solid var(--text)' : '0', cursor: 'pointer' }}
              />
            ))}
          </div>
        </Field>
        <ErrorBox error={error} />
        <div className="modal-actions">
          {card && (
            <ConfirmButton onConfirm={() => run(() => api.del(`/cards/${card.id}`)).then((ok) => ok && onDone())}>Excluir cartão</ConfirmButton>
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

export function PurchaseFormModal({
  card,
  item,
  month,
  onClose,
  onDone,
}: {
  card: Card;
  item?: InvoiceItem;
  month: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [description, setDescription] = useState(item?.description ?? '');
  const [recurring, setRecurring] = useState(item?.recurring ?? false);
  const [total, setTotal] = useState<number | null>(item?.totalCents ?? null);
  const [installments, setInstallments] = useState(item?.installments ?? 1);
  const [purchaseDate, setPurchaseDate] = useState(item?.purchaseDate ?? todayISO());
  const [category, setCategory] = useState<Category>(item?.category ?? 'OUTROS');
  const [responsibleId, setResponsibleId] = useState<string | null>(item?.responsible?.id ?? null);
  const { busy, error, setError, run } = useAction();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!total) return setError('Informe o valor');
    const body = { description, recurring, totalCents: total, installments: recurring ? 1 : installments, purchaseDate, category, responsibleId };
    const ok = await run(() => (item ? api.patch(`/cards/purchases/${item.purchaseId}`, body) : api.post(`/cards/${card.id}/purchases`, body)));
    if (ok) onDone();
  };

  const perInstallment = total && installments > 1 ? Math.floor(total / installments) : null;

  return (
    <Modal title={item ? 'Editar compra' : `Compra no ${card.name}`} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <div className="segmented">
          <button type="button" className={!recurring ? 'on' : ''} onClick={() => setRecurring(false)}>
            Compra
          </button>
          <button type="button" className={recurring ? 'on' : ''} onClick={() => setRecurring(true)}>
            Assinatura mensal
          </button>
        </div>
        <Field label="O que foi">
          <input
            className="input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={recurring ? 'Ex: Spotify, academia' : 'Ex: Mercado, farmácia, TV'}
            required
            autoFocus={!item}
          />
        </Field>
        <div className="grid-2">
          <MoneyField label={recurring ? 'Valor por mês' : 'Valor total'} value={total} onChange={setTotal} />
          {!recurring ? (
            <Field label="Parcelas" hint={perInstallment ? `${installments}x de ${brl(perInstallment)}` : undefined}>
              <select className="select" value={installments} onChange={(e) => setInstallments(Number(e.target.value))}>
                {Array.from({ length: 24 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n === 1 ? 'À vista' : `${n}x`}
                  </option>
                ))}
              </select>
            </Field>
          ) : (
            <span />
          )}
        </div>
        <div className="grid-2">
          <Field label={recurring ? 'Primeira cobrança' : 'Data da compra'}>
            <input className="input" type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} required />
          </Field>
          <CategorySelect value={category} onChange={setCategory} />
        </div>
        <MemberSelect label="Quem comprou" value={responsibleId} onChange={setResponsibleId} />
        <ErrorBox error={error} />
        <div className="modal-actions">
          {item?.recurring && (
            <ConfirmButton
              className="btn"
              onConfirm={() => run(() => api.post(`/cards/purchases/${item.purchaseId}/stop`, { lastMonth: month })).then((ok) => ok && onDone())}
            >
              Cancelar assinatura depois desta fatura
            </ConfirmButton>
          )}
          {item && (
            <ConfirmButton onConfirm={() => run(() => api.del(`/cards/purchases/${item.purchaseId}`)).then((ok) => ok && onDone())}>
              Excluir
            </ConfirmButton>
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
