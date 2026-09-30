import { NavLink, Outlet } from 'react-router-dom';
import { IconBills, IconCalendar, IconCard, IconCart, IconHome, IconMore, IconTasks, IconUsers, IconWallet } from './icons';

const links = [
  { to: '/', label: 'Início', icon: IconHome, end: true },
  { to: '/contas', label: 'Contas', icon: IconBills },
  { to: '/cartoes', label: 'Cartões', icon: IconCard },
  { to: '/dinheiro', label: 'Entradas', icon: IconWallet, desktop: true },
  { to: '/agenda', label: 'Agenda', icon: IconCalendar },
  { to: '/tarefas', label: 'Tarefas', icon: IconTasks, desktop: true },
  { to: '/compras', label: 'Compras', icon: IconCart, desktop: true },
  { to: '/familia', label: 'Família', icon: IconUsers, desktop: true },
];

export function Layout() {
  return (
    <div className="app">
      <nav className="nav" aria-label="Menu">
        <div className="brand">
          <img src="/icon.svg" alt="" width={32} height={32} />
          Casa em Dia
        </div>
        {links.map(({ to, label, icon: Icon, end, desktop }) => (
          <NavLink key={to} to={to} end={end} className={desktop ? 'desktop-only' : undefined}>
            <Icon />
            {label}
          </NavLink>
        ))}
        <NavLink to="/mais" className="more-link">
          <IconMore />
          Mais
        </NavLink>
      </nav>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
