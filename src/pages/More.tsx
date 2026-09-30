import { Link } from 'react-router-dom';
import { IconCart, IconRight, IconTasks, IconUsers, IconWallet } from '../components/icons';
import { useSession } from '../lib/session';

const items = [
  { to: '/dinheiro', label: 'Entradas e reservas', sub: 'Salário, outras entradas e dinheiro guardado', icon: IconWallet },
  { to: '/tarefas', label: 'Tarefas', sub: 'O que precisa ser feito e quem faz', icon: IconTasks },
  { to: '/compras', label: 'Lista de compras', sub: 'O que está faltando em casa', icon: IconCart },
  { to: '/familia', label: 'Família e conta', sub: 'Pessoas da casa, senha e sair', icon: IconUsers },
];

export function More() {
  const { household } = useSession();
  return (
    <div className="stack">
      <div className="page-head">
        <h1>{household?.name ?? 'Mais'}</h1>
      </div>
      <div className="card flush">
        <div className="list">
          {items.map(({ to, label, sub, icon: Icon }) => (
            <Link key={to} to={to} className="item" style={{ color: 'inherit', textDecoration: 'none' }}>
              <Icon width={22} height={22} style={{ color: 'var(--primary)', flex: 'none' }} />
              <div className="grow">
                <div className="title">{label}</div>
                <div className="sub">{sub}</div>
              </div>
              <IconRight width={18} height={18} className="muted" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
