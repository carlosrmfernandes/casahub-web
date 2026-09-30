import { useState } from 'react';
import { ErrorBox, Field } from '../components/ui';
import { useAction } from '../lib/hooks';
import { useSession } from '../lib/session';

export function Login() {
  const { login, register } = useSession();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [householdName, setHouseholdName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { busy, error, setError, run } = useAction();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    run(() =>
      mode === 'login' ? login(email, password) : register({ name, email, password, householdName: householdName || 'Minha Casa' }),
    );
  };

  const switchMode = (m: 'login' | 'register') => {
    setMode(m);
    setError(null);
  };

  return (
    <div className="auth">
      <div className="card">
        <div className="logo">
          <img src="/icon.svg" alt="" />
          <div>
            <h1>Casa em Dia</h1>
            <div className="muted small">Contas, tarefas, compras e agenda da família</div>
          </div>
        </div>
        <div className="segmented" style={{ marginBottom: 18 }}>
          <button type="button" className={mode === 'login' ? 'on' : ''} onClick={() => switchMode('login')}>
            Entrar
          </button>
          <button type="button" className={mode === 'register' ? 'on' : ''} onClick={() => switchMode('register')}>
            Criar conta
          </button>
        </div>
        <form className="form" onSubmit={submit}>
          {mode === 'register' && (
            <>
              <Field label="Seu nome">
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
              </Field>
              <Field label="Nome da casa" hint="Ex: Casa do Carlos, Família Silva">
                <input className="input" value={householdName} onChange={(e) => setHouseholdName(e.target.value)} placeholder="Minha Casa" />
              </Field>
            </>
          )}
          <Field label="E-mail">
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </Field>
          <Field label="Senha" hint={mode === 'register' ? 'Pelo menos 6 caracteres' : undefined}>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={mode === 'register' ? 6 : undefined}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </Field>
          <ErrorBox error={error} />
          <button className="btn primary block" disabled={busy}>
            {busy ? 'Aguarde…' : mode === 'login' ? 'Entrar' : 'Criar minha casa'}
          </button>
        </form>
      </div>
    </div>
  );
}
