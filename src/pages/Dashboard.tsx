import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PayBillModal } from '../components/BillModals';
import { PayInvoiceModal } from '../components/CardModals';
import { IconAlert } from '../components/icons';
import { ErrorBox, Loading, SharedMonthPicker } from '../components/ui';
import { api } from '../lib/api';
import { brl, CATEGORIES, currentMonth, dateShort, daysUntil, dueText, monthLabel, monthShort } from '../lib/format';
import { useLoad } from '../lib/hooks';
import { useSession } from '../lib/session';
import type { Dashboard as DashboardData, DueItem } from '../lib/types';

export function Dashboard() {
  const { month, user } = useSession();
  const { data, error, reload } = useLoad(() => api.get<DashboardData>(`/dashboard?month=${month}`), [month]);
  const [paying, setPaying] = useState<DueItem | null>(null);

  const done = () => {
    setPaying(null);
    reload();
  };

  const s = data?.summary;
  const paidPct = s && s.expensesCents > 0 ? Math.round((s.paidCents / s.expensesCents) * 100) : 0;
  const isCurrent = month === currentMonth();

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Olá, {user?.name.split(' ')[0]}</h1>
          <div className="muted small">Como está a casa em {monthLabel(month, false).toLowerCase()}</div>
        </div>
        <SharedMonthPicker />
      </div>

      <ErrorBox error={error} />
      {!data || !s ? (
        !error && <Loading />
      ) : (
        <>
          {s.expensesCents === 0 && s.incomeCents === 0 && (
            <div className="card">
              <h2>Vamos começar?</h2>
              <p className="muted">São 2 passos rápidos para você saber quanto sobra no mês:</p>
              <div className="row wrap">
                <Link className="btn primary" to="/contas?aba=fixas">
                  1. Cadastrar minhas contas
                </Link>
                <Link className="btn" to="/dinheiro">
                  2. Cadastrar o que eu recebo
                </Link>
              </div>
            </div>
          )}

          <div className={`card hero ${s.incomeCents === 0 ? '' : s.balanceCents < 0 ? 'negative' : 'positive'}`}>
            <div className="muted small">{isCurrent ? 'Se pagar tudo, no fim do mês vai sobrar' : `Em ${monthLabel(month)} vai sobrar`}</div>
            <div className={`big num ${s.balanceCents < 0 ? 'danger-text' : ''}`}>{brl(s.balanceCents)}</div>
            {s.incomeCents === 0 ? (
              <p className="small" style={{ margin: '6px 0 0' }}>
                Você ainda não cadastrou suas entradas. <Link to="/dinheiro">Cadastrar salário e outras entradas</Link>
              </p>
            ) : s.balanceCents < 0 ? (
              <p className="small danger-text" style={{ margin: '6px 0 0' }}>
                Os gastos passam das entradas em {brl(-s.balanceCents)}. Veja abaixo onde o dinheiro está indo.
              </p>
            ) : (
              <p className="small" style={{ margin: '6px 0 0' }}>
                Entram {brl(s.incomeCents)} e saem {brl(s.expensesCents)}.
              </p>
            )}
          </div>

          <div className="stats">
            <div className="card stat">
              <div className="label">Entradas</div>
              <div className="value num ok-text">{brl(s.incomeCents)}</div>
            </div>
            <div className="card stat">
              <div className="label">Gastos do mês</div>
              <div className="value num">{brl(s.expensesCents)}</div>
            </div>
            <div className="card stat">
              <div className="label">Já paguei</div>
              <div className="value num">{brl(s.paidCents)}</div>
            </div>
            <div className="card stat">
              <div className="label">Falta pagar</div>
              <div className={`value num ${s.pendingCents > 0 ? 'warn-text' : ''}`}>{brl(s.pendingCents)}</div>
            </div>
          </div>

          <div className="card">
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
              <span className="small">
                <b>{paidPct}%</b> dos gastos pagos · {s.billsPaidCount} de {s.billsCount} contas
              </span>
              <span className="small muted">
                Na conta agora: <b className={s.availableCents < 0 ? 'danger-text' : ''}>{brl(s.availableCents)}</b>
              </span>
            </div>
            <div className="progress">
              <div style={{ width: `${paidPct}%` }} />
            </div>
            {s.estimatedCount > 0 && (
              <p className="small warn-text" style={{ margin: '10px 0 0' }}>
                {s.estimatedCount} conta(s) estão com valor estimado ou sem valor. <Link to="/contas">Informar os valores</Link>
              </p>
            )}
          </div>

          {data.overdue.length > 0 && (
            <div className="card flush">
              <div className="card-head">
                <h2 className="danger-text row">
                  <IconAlert /> Atrasadas
                </h2>
                <span className="tag danger">{brl(data.overdue.reduce((t, o) => t + o.amountCents, 0))}</span>
              </div>
              <DueList items={data.overdue} onPay={setPaying} />
            </div>
          )}

          <div className="card flush">
            <div className="card-head">
              <h2>Próximos vencimentos</h2>
              <Link className="small" to="/contas">
                Ver todas
              </Link>
            </div>
            {data.upcoming.length === 0 ? (
              <div className="empty small">{s.pendingCents === 0 && s.expensesCents > 0 ? 'Tudo pago neste mês!' : 'Nada para vencer.'}</div>
            ) : (
              <DueList items={data.upcoming} onPay={setPaying} />
            )}
          </div>

          {data.byCategory.length > 0 && (
            <div className="card">
              <div className="card-head">
                <h2>Para onde vai o dinheiro</h2>
              </div>
              <div className="bars">
                {data.byCategory.map((c) => {
                  const pct = Math.round((c.amountCents / s.expensesCents) * 100);
                  return (
                    <div className="bar-row" key={c.category}>
                      <div className="row">
                        <span className="row">
                          <span className="dot" style={{ background: CATEGORIES[c.category].color }} />
                          {CATEGORIES[c.category].label}
                        </span>
                        <span className="num">
                          {brl(c.amountCents)} <span className="muted">· {pct}%</span>
                        </span>
                      </div>
                      <div className="progress">
                        <div style={{ width: `${pct}%`, background: CATEGORIES[c.category].color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="card">
            <div className="card-head">
              <h2>Próximos meses</h2>
              <span className="small muted">previsão</span>
            </div>
            <div className="table-wrap">
              <table className="num">
                <thead>
                  <tr>
                    <th>Mês</th>
                    <th>Entradas</th>
                    <th>Gastos</th>
                    <th>Sobra</th>
                  </tr>
                </thead>
                <tbody>
                  {data.projection.map((p) => (
                    <tr key={p.month}>
                      <td>{monthShort(p.month)}</td>
                      <td>{brl(p.incomeCents)}</td>
                      <td>{brl(p.expensesCents)}</td>
                      <td className={p.balanceCents < 0 ? 'danger-text' : 'ok-text'}>
                        <b>{brl(p.balanceCents)}</b>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.projection.some((p) => p.ending.length) && (
              <div className="stack" style={{ gap: 6, marginTop: 12 }}>
                {data.projection
                  .filter((p) => p.ending.length)
                  .map((p) => (
                    <div key={p.month} className="small muted">
                      Última parcela em {monthLabel(p.month, false).toLowerCase()}: {p.ending.map((e) => `${e.name} (${brl(e.amountCents)})`).join(', ')}
                    </div>
                  ))}
              </div>
            )}
          </div>

          <div className="stats" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
            <Link to="/tarefas" className="card stat" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="label">Tarefas para hoje</div>
              <div className="value">{data.tasks.length}</div>
              {data.tasks.slice(0, 3).map((t) => (
                <div key={t.id} className="small muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  • {t.title}
                  {t.assignee ? ` (${t.assignee.name.split(' ')[0]})` : ''}
                </div>
              ))}
            </Link>
            <Link to="/compras" className="card stat" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="label">Lista de compras</div>
              <div className="value">{data.shoppingCount}</div>
              <div className="small muted">itens para comprar</div>
            </Link>
            <Link to="/dinheiro" className="card stat" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="label">Guardado nas reservas</div>
              <div className="value num">{brl(s.reservesCents)}</div>
            </Link>
          </div>
        </>
      )}

      {paying?.kind === 'bill' && (
        <PayBillModal bill={{ ...paying, method: null }} onClose={() => setPaying(null)} onDone={done} />
      )}
      {paying?.kind === 'invoice' && (
        <PayInvoiceModal
          cardId={paying.cardId!}
          month={paying.month}
          name={paying.name}
          amountCents={paying.amountCents}
          onClose={() => setPaying(null)}
          onDone={done}
        />
      )}
    </div>
  );
}

function DueList({ items, onPay }: { items: DueItem[]; onPay: (i: DueItem) => void }) {
  return (
    <div className="list">
      {items.map((i) => {
        const late = daysUntil(i.dueDate) < 0;
        return (
          <div key={i.id} className="item" style={{ cursor: 'default' }}>
            <div className="grow">
              <div className="title">{i.name}</div>
              <div className={`sub ${late ? 'danger-text' : ''}`}>
                {dueText(i.dueDate)}
                {late && ` (${dateShort(i.dueDate)})`}
                {i.estimated && i.amountCents > 0 && <span className="tag warn" style={{ marginLeft: 6 }}>valor estimado</span>}
              </div>
            </div>
            <span className="amount num">{i.amountCents ? brl(i.amountCents) : <span className="tag warn">sem valor</span>}</span>
            <button className="btn small primary" onClick={() => onPay(i)}>
              Paguei
            </button>
          </div>
        );
      })}
    </div>
  );
}
