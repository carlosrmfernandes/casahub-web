import { useEffect, useState, type ReactNode } from 'react';
import { addMonths, CATEGORIES, CATEGORY_LIST, METHODS, monthLabel, moneyInput, parseMoney } from '../lib/format';
import { useSession } from '../lib/session';
import type { Category, MemberRef, PaymentMethod } from '../lib/types';
import { IconCheck, IconClose, IconLeft, IconRight } from './icons';

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);
  return (
    <div className="backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Fechar">
            <IconClose />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function MonthPicker({ value, onChange }: { value: string; onChange: (m: string) => void }) {
  return (
    <div className="month-picker">
      <button className="icon-btn" onClick={() => onChange(addMonths(value, -1))} aria-label="Mês anterior">
        <IconLeft />
      </button>
      <span className="label">{monthLabel(value)}</span>
      <button className="icon-btn" onClick={() => onChange(addMonths(value, 1))} aria-label="Próximo mês">
        <IconRight />
      </button>
    </div>
  );
}

/** Seletor de mês do app (compartilhado entre Início, Contas e Cartões). */
export function SharedMonthPicker() {
  const { month, setMonth } = useSession();
  return <MonthPicker value={month} onChange={setMonth} />;
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

/** Campo de dinheiro: aceita "1.668,50" ou "1668". Devolve centavos (ou null). */
export function MoneyField({
  label,
  value,
  onChange,
  hint,
  autoFocus,
}: {
  label: string;
  value: number | null;
  onChange: (cents: number | null) => void;
  hint?: string;
  autoFocus?: boolean;
}) {
  const [text, setText] = useState(moneyInput(value));
  useEffect(() => {
    if (parseMoney(text) !== value) setText(moneyInput(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <Field label={label} hint={hint}>
      <input
        className="input num"
        inputMode="decimal"
        placeholder="0,00"
        value={text}
        autoFocus={autoFocus}
        onChange={(e) => {
          setText(e.target.value);
          onChange(parseMoney(e.target.value));
        }}
      />
    </Field>
  );
}

export function CategorySelect({ value, onChange }: { value: Category; onChange: (c: Category) => void }) {
  return (
    <Field label="Categoria">
      <select className="select" value={value} onChange={(e) => onChange(e.target.value as Category)}>
        {CATEGORY_LIST.map((c) => (
          <option key={c} value={c}>
            {CATEGORIES[c].label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function MethodSelect({ value, onChange }: { value: PaymentMethod | null; onChange: (m: PaymentMethod | null) => void }) {
  return (
    <Field label="Como paga">
      <select className="select" value={value ?? ''} onChange={(e) => onChange((e.target.value || null) as PaymentMethod | null)}>
        <option value="">Não informado</option>
        {Object.entries(METHODS).map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function MemberSelect({ label = 'Responsável', value, onChange }: { label?: string; value: string | null; onChange: (id: string | null) => void }) {
  const { members } = useSession();
  return (
    <Field label={label}>
      <select className="select" value={value ?? ''} onChange={(e) => onChange(e.target.value || null)}>
        <option value="">Ninguém</option>
        {members.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function Avatar({ member }: { member: MemberRef | null | undefined }) {
  if (!member) return null;
  return (
    <span className="avatar" style={{ background: member.color }} title={member.name}>
      {member.name.slice(0, 1).toUpperCase()}
    </span>
  );
}

export function Check({ on, late, onClick, label }: { on: boolean; late?: boolean; onClick: () => void; label: string }) {
  return (
    <button
      className={`check${on ? ' on' : ''}${late && !on ? ' late' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={label}
      aria-pressed={on}
    >
      {on && <IconCheck />}
    </button>
  );
}

export function ErrorBox({ error }: { error: string | null | undefined }) {
  if (!error) return null;
  return <div className="error" role="alert">{error}</div>;
}

export function Loading() {
  return <div className="empty">Carregando…</div>;
}

/** Botão que pede confirmação no segundo clique (sem janelas do navegador). */
export function ConfirmButton({ children, onConfirm, className = 'btn danger' }: { children: ReactNode; onConfirm: () => void; className?: string }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <button type="button" className={className} onClick={() => (armed ? onConfirm() : setArmed(true))}>
      {armed ? 'Toque de novo para confirmar' : children}
    </button>
  );
}
