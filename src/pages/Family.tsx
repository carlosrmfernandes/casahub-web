import { useState } from 'react';
import { Avatar, ConfirmButton, ErrorBox, Field, Modal } from '../components/ui';
import { api } from '../lib/api';
import { MEMBER_COLORS } from '../lib/format';
import { useAction } from '../lib/hooks';
import { useSession } from '../lib/session';
import type { Member } from '../lib/types';

export function Family() {
  const { user, household, members, refresh, logout } = useSession();
  const [editing, setEditing] = useState<Member | 'new' | null>(null);
  const [houseName, setHouseName] = useState(household?.name ?? '');
  const [pwd, setPwd] = useState({ current: '', next: '' });
  const house = useAction();
  const password = useAction();
  const [pwdOk, setPwdOk] = useState(false);
  const isAdmin = user?.role === 'ADMIN';

  return (
    <div className="stack">
      <div className="page-head">
        <h1>Família</h1>
      </div>

      <div className="card flush">
        <div className="card-head">
          <div>
            <h2>Quem mora na casa</h2>
            <div className="small muted">Cadastre todos para dividir tarefas e contas. Quem tiver e-mail e senha também pode entrar no app.</div>
          </div>
          {isAdmin && (
            <button className="btn small primary" onClick={() => setEditing('new')}>
              + Pessoa
            </button>
          )}
        </div>
        <div className="list">
          {members.map((m) => (
            <button key={m.id} className="item" onClick={() => (isAdmin || m.id === user?.id) && setEditing(m)}>
              <Avatar member={m} />
              <div className="grow">
                <div className="title">
                  {m.name} {m.id === user?.id && <span className="muted small">(você)</span>}
                </div>
                <div className="sub">{m.hasLogin ? m.email : 'sem acesso ao app'}</div>
              </div>
              {m.role === 'ADMIN' && <span className="tag info">admin</span>}
            </button>
          ))}
        </div>
      </div>

      <form
        className="card form"
        onSubmit={(e) => {
          e.preventDefault();
          house.run(() => api.patch('/auth/household', { name: houseName })).then((ok) => ok && refresh());
        }}
      >
        <h2>Nome da casa</h2>
        <div className="quick-add">
          <input className="input" value={houseName} onChange={(e) => setHouseName(e.target.value)} required />
          <button className="btn" disabled={house.busy}>
            Salvar
          </button>
        </div>
        <ErrorBox error={house.error} />
      </form>

      <form
        className="card form"
        onSubmit={(e) => {
          e.preventDefault();
          setPwdOk(false);
          password.run(() => api.post('/auth/password', pwd)).then((ok) => {
            if (ok) {
              setPwd({ current: '', next: '' });
              setPwdOk(true);
            }
          });
        }}
      >
        <h2>Trocar minha senha</h2>
        <div className="grid-2">
          <Field label="Senha atual">
            <input className="input" type="password" value={pwd.current} onChange={(e) => setPwd({ ...pwd, current: e.target.value })} required autoComplete="current-password" />
          </Field>
          <Field label="Nova senha">
            <input className="input" type="password" value={pwd.next} onChange={(e) => setPwd({ ...pwd, next: e.target.value })} required minLength={6} autoComplete="new-password" />
          </Field>
        </div>
        <ErrorBox error={password.error} />
        {pwdOk && <div className="alert info small">Senha alterada.</div>}
        <button className="btn" style={{ justifySelf: 'start' }} disabled={password.busy}>
          Trocar senha
        </button>
      </form>

      <button className="btn danger" style={{ justifySelf: 'start' }} onClick={logout}>
        Sair do app
      </button>

      {editing && (
        <MemberModal
          member={editing === 'new' ? undefined : editing}
          canManage={isAdmin}
          isSelf={editing !== 'new' && editing.id === user?.id}
          onClose={() => setEditing(null)}
          onDone={() => {
            setEditing(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function MemberModal({
  member,
  canManage,
  isSelf,
  onClose,
  onDone,
}: {
  member?: Member;
  canManage: boolean;
  isSelf: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const [name, setName] = useState(member?.name ?? '');
  const [color, setColor] = useState(member?.color ?? MEMBER_COLORS[1]);
  const [access, setAccess] = useState(!!member?.hasLogin);
  const [email, setEmail] = useState(member?.email ?? '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(member?.role ?? 'MEMBER');
  const { busy, error, run } = useAction();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const body: Record<string, unknown> = { name, color };
    if (access) {
      body.email = email;
      if (password) body.password = password;
    } else if (member?.hasLogin === false || !member) {
      body.email = null;
    }
    if (canManage && !isSelf) body.role = role;
    const ok = await run(() => (member ? api.patch(`/members/${member.id}`, body) : api.post('/members', body)));
    if (ok) onDone();
  };

  return (
    <Modal title={member ? member.name : 'Nova pessoa'} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <Field label="Nome">
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Gabriel" required autoFocus={!member} />
        </Field>
        <Field label="Cor">
          <div className="row wrap">
            {MEMBER_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={`Cor ${c}`}
                style={{ width: 32, height: 32, borderRadius: '50%', background: c, border: color === c ? '3px solid var(--text)' : 0, cursor: 'pointer' }}
              />
            ))}
          </div>
        </Field>
        <label className="toggle">
          <input type="checkbox" checked={access} onChange={(e) => setAccess(e.target.checked)} disabled={member?.hasLogin} />
          Pode entrar no app (com e-mail e senha)
        </label>
        {access && (
          <div className="grid-2">
            <Field label="E-mail">
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </Field>
            <Field label={member?.hasLogin ? 'Nova senha (opcional)' : 'Senha'}>
              <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required={!member?.hasLogin} />
            </Field>
          </div>
        )}
        {canManage && !isSelf && access && (
          <label className="toggle">
            <input type="checkbox" checked={role === 'ADMIN'} onChange={(e) => setRole(e.target.checked ? 'ADMIN' : 'MEMBER')} />
            Administrador (pode cadastrar e remover pessoas)
          </label>
        )}
        <ErrorBox error={error} />
        <div className="modal-actions">
          {member && canManage && !isSelf && (
            <ConfirmButton onConfirm={() => run(() => api.del(`/members/${member.id}`)).then((ok) => ok && onDone())}>Remover</ConfirmButton>
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
