import { useState, type ReactNode } from 'react';
import { ErrorBox } from '../components/ui';
import { api } from '../lib/api';
import { brl, CATEGORIES, currentMonth, moneyInput, parseMoney } from '../lib/format';
import { useAction } from '../lib/hooks';
import type { Category } from '../lib/types';

/** Próxima ocorrência do mês (1-12) a partir de hoje, em "AAAA-MM". */
function nextMonthNamed(m: number) {
  const [y, cur] = currentMonth().split('-').map(Number);
  return `${m >= cur ? y : y + 1}-${String(m).padStart(2, '0')}`;
}

type Row = {
  include: boolean;
  name: string;
  category: Category;
  amount: string;
  dueDay: number;
  variable: boolean;
  endMonth: string;
};

const row = (name: string, category: Category, reais: number, opts: Partial<Row> = {}): Row => ({
  include: true,
  name,
  category,
  amount: reais ? moneyInput(reais * 100) : '',
  dueDay: 10,
  variable: false,
  endMonth: '',
  ...opts,
});

/** Lista inicial das contas da casa; dá para ajustar tudo antes de salvar. */
const TEMPLATE: Row[] = [
  row('Casa SP', 'MORADIA', 1668, { endMonth: nextMonthNamed(12) }),
  row('Recanto do Lago', 'MORADIA', 1950),
  row('Parcela do Carro', 'TRANSPORTE', 1750),
  row('Seguro do Carro', 'TRANSPORTE', 356),
  row('Condomínio', 'MORADIA', 400),
  row('Netflix', 'ASSINATURAS', 60),
  row('Contador JB', 'SERVICOS', 350),
  row('Crédito Trabalhista', 'DIVIDAS', 1900, { endMonth: nextMonthNamed(3) }),
  row('Imposto de Renda', 'IMPOSTOS', 740, { endMonth: nextMonthNamed(12) }),
  row('Água', 'CONTAS_CASA', 0, { variable: true }),
  row('Luz', 'CONTAS_CASA', 0, { variable: true }),
  row('Internet', 'CONTAS_CASA', 0),
  row('Fono', 'SAUDE', 0),
  row('Psicóloga', 'SAUDE', 0),
  row('Escola Gabriel', 'EDUCACAO', 0),
];

export function StarterBills({ onDone, onCustom, extra }: { onDone: () => void; onCustom: () => void; extra?: ReactNode }) {
  const [rows, setRows] = useState<Row[]>(TEMPLATE);
  const [paidBeforeToday, setPaidBeforeToday] = useState(true);
  const { busy, error, run } = useAction();

  const set = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const chosen = rows.filter((r) => r.include && r.name.trim());
  const total = chosen.reduce((s, r) => s + (parseMoney(r.amount) ?? 0), 0);

  const save = async () => {
    const body = chosen.map((r) => ({
      name: r.name.trim(),
      category: r.category,
      amountCents: parseMoney(r.amount) ?? 0,
      variable: r.variable,
      dueDay: r.dueDay,
      endMonth: r.endMonth || null,
    }));
    const ok = await run(() => api.post('/recurring-bills/bulk', { items: body, paidBeforeToday }));
    if (ok) onDone();
  };

  return (
    <div className="stack">
      <div className="card">
        <h2>Comece por aqui</h2>
        <p className="muted small" style={{ marginBottom: 0 }}>
          Já deixei preenchidas as contas que você me passou. Confira os valores, o <b>dia do vencimento</b> e até quando cada uma vai. As que estão sem
          valor (água, luz, escola…) você pode deixar em branco e informar quando chegar a conta.
        </p>
      </div>

      <div className="card flush">
        <div className="table-wrap">
          <table className="starter">
            <thead>
              <tr>
                <th />
                <th>Conta</th>
                <th>Valor (R$)</th>
                <th>Dia</th>
                <th>Até</th>
                <th>Varia?</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} style={{ opacity: r.include ? 1 : 0.45 }}>
                  <td>
                    <input type="checkbox" checked={r.include} onChange={(e) => set(i, { include: e.target.checked })} aria-label={`Incluir ${r.name}`} />
                  </td>
                  <td style={{ minWidth: 170 }}>
                    <div className="row" style={{ gap: 6 }}>
                      <span className="dot" style={{ background: CATEGORIES[r.category].color }} title={CATEGORIES[r.category].label} />
                      <input className="input" value={r.name} onChange={(e) => set(i, { name: e.target.value })} />
                    </div>
                  </td>
                  <td style={{ minWidth: 100 }}>
                    <input
                      className="input num"
                      inputMode="decimal"
                      placeholder={r.variable ? 'varia' : 'a definir'}
                      value={r.amount}
                      onChange={(e) => set(i, { amount: e.target.value })}
                    />
                  </td>
                  <td>
                    <input className="input num day-input" type="number" min={1} max={31} value={r.dueDay} onChange={(e) => set(i, { dueDay: Number(e.target.value) })} />
                  </td>
                  <td style={{ minWidth: 140 }}>
                    <input className="input" type="month" value={r.endMonth} onChange={(e) => set(i, { endMonth: e.target.value })} title="Vazio = sem fim" />
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <input type="checkbox" checked={r.variable} onChange={(e) => set(i, { variable: e.target.checked })} aria-label="Valor varia todo mês" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="row wrap" style={{ padding: 16, borderTop: '1px solid var(--border)' }}>
          <button className="btn small" onClick={() => setRows((rs) => [...rs, row('', 'OUTROS', 0)])}>
            + Adicionar linha
          </button>
          <span className="spacer" />
          <span className="small muted">
            {chosen.length} contas · <b className="num">{brl(total)}</b> por mês
          </span>
        </div>
      </div>

      <label className="toggle">
        <input type="checkbox" checked={paidBeforeToday} onChange={(e) => setPaidBeforeToday(e.target.checked)} />
        Já paguei as contas deste mês que venceram antes de hoje
      </label>
      <ErrorBox error={error} />
      <div className="row wrap">
        <button className="btn primary" onClick={save} disabled={busy || chosen.length === 0}>
          {busy ? 'Salvando…' : `Salvar ${chosen.length} contas`}
        </button>
        <button className="btn ghost" onClick={onCustom}>
          Prefiro cadastrar uma por uma
        </button>
      </div>
      {extra}
    </div>
  );
}
