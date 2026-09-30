import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, getToken, setToken } from './api';
import { currentMonth } from './format';
import type { Household, Member, User } from './types';

type AuthResponse = { token: string; user: User; household: Household };

type Session = {
  user: User | null;
  household: Household | null;
  members: Member[];
  ready: boolean;
  month: string;
  setMonth: (m: string) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { name: string; email: string; password: string; householdName: string }) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
};

const Ctx = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [household, setHousehold] = useState<Household | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [ready, setReady] = useState(false);
  const [month, setMonth] = useState(currentMonth());

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setHousehold(null);
    setMembers([]);
  }, []);

  const refresh = useCallback(async () => {
    const [me, list] = await Promise.all([
      api.get<{ user: User; household: Household }>('/auth/me'),
      api.get<Member[]>('/members'),
    ]);
    setUser(me.user);
    setHousehold(me.household);
    setMembers(list);
  }, []);

  useEffect(() => {
    if (!getToken()) {
      setReady(true);
      return;
    }
    refresh()
      .catch(() => logout())
      .finally(() => setReady(true));
  }, [refresh, logout]);

  useEffect(() => {
    window.addEventListener('casahub:logout', logout);
    return () => window.removeEventListener('casahub:logout', logout);
  }, [logout]);

  const start = async (res: AuthResponse) => {
    setToken(res.token);
    await refresh();
  };

  const value: Session = {
    user,
    household,
    members,
    ready,
    month,
    setMonth,
    logout,
    refresh,
    login: async (email, password) => start(await api.post<AuthResponse>('/auth/login', { email, password })),
    register: async (data) => start(await api.post<AuthResponse>('/auth/register', data)),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession() {
  const s = useContext(Ctx);
  if (!s) throw new Error('useSession fora do SessionProvider');
  return s;
}
