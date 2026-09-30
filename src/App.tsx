import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Loading } from './components/ui';
import { SessionProvider, useSession } from './lib/session';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Bills } from './pages/Bills';
import { Cards } from './pages/Cards';
import { Money } from './pages/Money';
import { Agenda } from './pages/Agenda';
import { Tasks } from './pages/Tasks';
import { Shopping } from './pages/Shopping';
import { Family } from './pages/Family';
import { More } from './pages/More';

function AppRoutes() {
  const { user, ready } = useSession();
  if (!ready) return <Loading />;
  if (!user) return <Login />;
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="contas" element={<Bills />} />
        <Route path="cartoes" element={<Cards />} />
        <Route path="dinheiro" element={<Money />} />
        <Route path="agenda" element={<Agenda />} />
        <Route path="tarefas" element={<Tasks />} />
        <Route path="compras" element={<Shopping />} />
        <Route path="familia" element={<Family />} />
        <Route path="mais" element={<More />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export function App() {
  return (
    <SessionProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </SessionProvider>
  );
}
