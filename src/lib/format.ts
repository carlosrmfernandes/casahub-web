import type { Category, PaymentMethod } from './types';

const brlFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export const brl = (cents: number) => brlFmt.format(cents / 100);

/** "1.668,50", "1668", "1668.5" → centavos. Vazio/ inválido → null. */
export function parseMoney(input: string): number | null {
  let s = input.trim().replace(/[R$\s]/g, '');
  if (!s) return null;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

/** Centavos → texto para editar num campo ("1668,50"). */
export const moneyInput = (cents: number | null | undefined) =>
  cents == null ? '' : (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: 2 });

const TZ = 'America/Sao_Paulo';
export const todayISO = () => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
export const currentMonth = () => todayISO().slice(0, 7);

export function addMonths(month: string, n: number) {
  const [y, m] = month.split('-').map(Number);
  const t = y * 12 + (m - 1) + n;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`;
}

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

export function monthLabel(month: string, withYear = true) {
  const [y, m] = month.split('-').map(Number);
  const name = MONTHS[m - 1];
  const cap = name[0].toUpperCase() + name.slice(1);
  return withYear ? `${cap} de ${y}` : cap;
}

export function monthShort(month: string) {
  const [y, m] = month.split('-').map(Number);
  return `${MONTHS[m - 1].slice(0, 3)}/${String(y).slice(2)}`;
}

export function dateShort(iso: string) {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}

export function weekday(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

export function daysUntil(iso: string) {
  const a = Date.parse(`${todayISO()}T00:00:00Z`);
  const b = Date.parse(`${iso}T00:00:00Z`);
  return Math.round((b - a) / 86400000);
}

export function dueText(iso: string) {
  const d = daysUntil(iso);
  if (d < -1) return `venceu há ${-d} dias`;
  if (d === -1) return 'venceu ontem';
  if (d === 0) return 'vence hoje';
  if (d === 1) return 'vence amanhã';
  if (d <= 7) return `vence ${weekday(iso)}, ${dateShort(iso)}`;
  return `vence ${dateShort(iso)}`;
}

export const CATEGORIES: Record<Category, { label: string; color: string }> = {
  MORADIA: { label: 'Moradia', color: '#0f766e' },
  CONTAS_CASA: { label: 'Água, luz e internet', color: '#0284c7' },
  TRANSPORTE: { label: 'Carro e transporte', color: '#7c3aed' },
  SAUDE: { label: 'Saúde', color: '#db2777' },
  EDUCACAO: { label: 'Educação', color: '#ea580c' },
  ASSINATURAS: { label: 'Assinaturas', color: '#9333ea' },
  IMPOSTOS: { label: 'Impostos', color: '#b45309' },
  DIVIDAS: { label: 'Dívidas e acordos', color: '#dc2626' },
  SERVICOS: { label: 'Serviços', color: '#4f46e5' },
  MERCADO: { label: 'Mercado', color: '#16a34a' },
  LAZER: { label: 'Lazer', color: '#ca8a04' },
  OUTROS: { label: 'Outros', color: '#64748b' },
};

export const CATEGORY_LIST = Object.keys(CATEGORIES) as Category[];

export const METHODS: Record<PaymentMethod, string> = {
  PIX: 'Pix',
  BOLETO: 'Boleto',
  DEBITO: 'Débito',
  DEBITO_AUTOMATICO: 'Débito automático',
  DINHEIRO: 'Dinheiro',
  CARTAO: 'Cartão de crédito',
};

export const MEMBER_COLORS = ['#0f766e', '#2563eb', '#db2777', '#ea580c', '#7c3aed', '#16a34a', '#ca8a04', '#475569'];
