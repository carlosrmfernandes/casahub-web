export type Category =
  | 'MORADIA'
  | 'CONTAS_CASA'
  | 'TRANSPORTE'
  | 'SAUDE'
  | 'EDUCACAO'
  | 'ASSINATURAS'
  | 'IMPOSTOS'
  | 'DIVIDAS'
  | 'SERVICOS'
  | 'MERCADO'
  | 'LAZER'
  | 'OUTROS';

export type PaymentMethod = 'PIX' | 'BOLETO' | 'DEBITO' | 'DEBITO_AUTOMATICO' | 'DINHEIRO' | 'CARTAO';
export type BillStatus = 'PENDENTE' | 'PAGO' | 'IGNORADA';

export type MemberRef = { id: string; name: string; color: string };

export type User = { id: string; name: string; email: string | null; role: 'ADMIN' | 'MEMBER'; color: string };
export type Member = User & { hasLogin: boolean };
export type Household = { id: string; name: string };

export type RecurringBill = {
  id: string;
  name: string;
  category: Category;
  amountCents: number;
  variable: boolean;
  dueDay: number;
  startMonth: string;
  endMonth: string | null;
  method: PaymentMethod | null;
  responsibleId: string | null;
  responsible: MemberRef | null;
  active: boolean;
  notes: string | null;
};

export type Bill = {
  id: string;
  recurringBillId: string | null;
  month: string;
  name: string;
  category: Category;
  amountCents: number;
  estimated: boolean;
  dueDate: string;
  status: BillStatus;
  paidAt: string | null;
  method: PaymentMethod | null;
  responsibleId: string | null;
  responsible: MemberRef | null;
  notes: string | null;
  overdue: boolean;
};

export type Card = { id: string; name: string; closingDay: number; dueDay: number; limitCents: number | null; color: string };

export type InvoiceItem = {
  purchaseId: string;
  description: string;
  category: Category;
  purchaseDate: string;
  recurring: boolean;
  installment: number | null;
  installments: number;
  totalCents: number;
  amountCents: number;
  responsible: MemberRef | null;
};

export type Invoice = {
  cardId: string;
  cardName: string;
  color: string;
  closingDay: number;
  dueDay: number;
  limitCents: number | null;
  month: string;
  dueDate: string;
  status: 'PENDENTE' | 'PAGO';
  paidAt: string | null;
  computedCents: number;
  overrideCents: number | null;
  totalCents: number;
  items: InvoiceItem[];
};

export type Income = {
  id: string;
  name: string;
  amountCents: number;
  day: number | null;
  recurring: boolean;
  startMonth: string;
  endMonth: string | null;
};

export type Reserve = {
  id: string;
  name: string;
  goalCents: number | null;
  balanceCents: number;
  movements: { id: string; type: 'DEPOSITO' | 'RETIRADA'; amountCents: number; date: string; note: string | null }[];
};

export type Task = {
  id: string;
  title: string;
  notes: string | null;
  assigneeId: string | null;
  assignee: MemberRef | null;
  dueDate: string | null;
  recurrence: 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
  done: boolean;
  overdue: boolean;
};

export type ShoppingItem = { id: string; name: string; quantity: string | null; checked: boolean };

export type CalEvent = {
  id: string;
  title: string;
  date: string;
  time: string | null;
  notes: string | null;
  memberId: string | null;
  member: MemberRef | null;
};

export type DueItem = {
  kind: 'bill' | 'invoice';
  id: string;
  name: string;
  amountCents: number;
  dueDate: string;
  estimated: boolean;
  cardId?: string;
  month: string;
};

export type Dashboard = {
  month: string;
  today: string;
  summary: {
    incomeCents: number;
    expensesCents: number;
    paidCents: number;
    pendingCents: number;
    balanceCents: number;
    availableCents: number;
    billsTotal: number;
    billsPaid: number;
    cardsTotal: number;
    cardsPaid: number;
    reservesCents: number;
    billsCount: number;
    billsPaidCount: number;
    estimatedCount: number;
  };
  overdue: DueItem[];
  upcoming: DueItem[];
  byCategory: { category: Category; amountCents: number }[];
  invoices: Omit<Invoice, 'items'>[];
  tasks: { id: string; title: string; dueDate: string | null; assignee: MemberRef | null }[];
  shoppingCount: number;
  projection: {
    month: string;
    incomeCents: number;
    billsCents: number;
    cardsCents: number;
    expensesCents: number;
    balanceCents: number;
    ending: { id: string; name: string; amountCents: number }[];
  }[];
};

export type CalendarItem = {
  date: string;
  type: 'event' | 'bill' | 'invoice' | 'task' | 'income';
  id: string;
  title: string;
  time?: string | null;
  amountCents?: number;
  status?: string;
  overdue?: boolean;
  color?: string | null;
};
