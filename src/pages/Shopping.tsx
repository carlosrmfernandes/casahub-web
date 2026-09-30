import { useState } from 'react';
import { Check, ConfirmButton, ErrorBox, Loading } from '../components/ui';
import { api } from '../lib/api';
import { useAction, useLoad } from '../lib/hooks';
import type { ShoppingItem } from '../lib/types';

export function Shopping() {
  const { data, error, reload, setData } = useLoad(() => api.get<ShoppingItem[]>('/shopping'), []);
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const action = useAction();

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const item = await action.run(() => api.post<ShoppingItem>('/shopping', { name, quantity: quantity || null }));
    if (item) {
      setData((list) => [item, ...(list ?? [])]);
      setName('');
      setQuantity('');
    }
  };

  const toggle = async (i: ShoppingItem) => {
    setData((list) => list && list.map((x) => (x.id === i.id ? { ...x, checked: !x.checked } : x)));
    const ok = await action.run(() => api.patch(`/shopping/${i.id}`, { checked: !i.checked }));
    if (!ok) reload();
  };

  const remove = async (i: ShoppingItem) => {
    setData((list) => list && list.filter((x) => x.id !== i.id));
    const ok = await action.run(() => api.del(`/shopping/${i.id}`));
    if (!ok) reload();
  };

  if (!data) return error ? <ErrorBox error={error} /> : <Loading />;
  const pending = data.filter((i) => !i.checked);
  const checked = data.filter((i) => i.checked);

  return (
    <div className="stack">
      <div className="page-head">
        <h1>Lista de compras</h1>
        <span className="muted small">{pending.length} para comprar</span>
      </div>
      <form className="quick-add" onSubmit={add}>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Item (ex: arroz, sabão)" />
        <input className="input" style={{ maxWidth: 90, flex: 'none' }} value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="Qtd" />
        <button className="btn primary" disabled={action.busy}>
          +
        </button>
      </form>
      <ErrorBox error={action.error} />

      <div className="card flush">
        {pending.length === 0 ? (
          <div className="empty small">A lista está vazia. Quem lembrar de algo que acabou, coloca aqui.</div>
        ) : (
          <div className="list">
            {pending.map((i) => (
              <Row key={i.id} i={i} onToggle={() => toggle(i)} onRemove={() => remove(i)} />
            ))}
          </div>
        )}
      </div>

      {checked.length > 0 && (
        <div className="card flush">
          <div className="card-head">
            <h2 className="muted">No carrinho ({checked.length})</h2>
            <ConfirmButton
              className="btn small"
              onConfirm={() =>
                action.run(() => api.post('/shopping/clear-checked')).then(() => setData((list) => list && list.filter((x) => !x.checked)))
              }
            >
              Limpar comprados
            </ConfirmButton>
          </div>
          <div className="list">
            {checked.map((i) => (
              <Row key={i.id} i={i} onToggle={() => toggle(i)} onRemove={() => remove(i)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ i, onToggle, onRemove }: { i: ShoppingItem; onToggle: () => void; onRemove: () => void }) {
  return (
    <div className={`item${i.checked ? ' done' : ''}`} onClick={onToggle}>
      <Check on={i.checked} onClick={onToggle} label={i.checked ? 'Desmarcar' : 'Marcar como comprado'} />
      <div className="grow">
        <div className="title">{i.name}</div>
      </div>
      {i.quantity && <span className="tag">{i.quantity}</span>}
      <button
        className="btn ghost small"
        aria-label={`Remover ${i.name}`}
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
      >
        ✕
      </button>
    </div>
  );
}
