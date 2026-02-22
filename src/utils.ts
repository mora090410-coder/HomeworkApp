import { GRADE_VALUES } from '@/constants';
import { Grade, GradeConfig, Subject, Task, TaskStatus, Transaction } from '@/types';

const DEFAULT_RATE_MAP: Record<Grade, number> = GRADE_VALUES;

export * from './utils/calculations';
import { centsToDollars } from './utils/calculations';

export const getNextGrade = (current: Grade): Grade => {
  const grades = Object.values(Grade);
  const index = grades.indexOf(current);
  return grades[(index + 1) % grades.length];
};

export const getTaskIcon = (name: string): string => {
  const lower = name.toLowerCase();
  if (lower.includes('clean') || lower.includes('room') || lower.includes('tidy')) return '🧹';
  if (lower.includes('wash') || lower.includes('dish') || lower.includes('plate')) return '🧽';
  if (lower.includes('dog') || lower.includes('walk') || lower.includes('pet')) return '🐕';
  if (lower.includes('trash') || lower.includes('garbage') || lower.includes('bin')) return '🗑️';
  if (lower.includes('homework') || lower.includes('study') || lower.includes('read')) return '📚';
  if (lower.includes('lawn') || lower.includes('mow') || lower.includes('grass') || lower.includes('yard')) return '🌱';
  if (lower.includes('laundry') || lower.includes('fold') || lower.includes('clothes')) return '👕';
  if (lower.includes('car') || lower.includes('vehicle')) return '🚗';
  if (lower.includes('plant') || lower.includes('water')) return '🪴';
  if (lower.includes('cook') || lower.includes('meal') || lower.includes('dinner')) return '🍳';
  return '📝';
};

/**
 * Returns the icon for a task, prioritizing the explicitly set emoji if available.
 */
export const getTaskIconForTask = (task: Task): string => {
  if (task.emoji) return task.emoji;
  return getTaskIcon(task.name);
};

export const parseTaskStatus = (value: unknown): TaskStatus => {
  const supported: TaskStatus[] = [
    'DRAFT',
    'OPEN',
    'ASSIGNED',
    'PENDING_APPROVAL',
    'PENDING_PAYMENT',
    'PAID',
    'DELETED',
  ];

  if (typeof value === 'string' && supported.includes(value as TaskStatus)) {
    return value as TaskStatus;
  }

  return 'OPEN';
};

const toIsoString = (value: unknown): string => {
  if (value && typeof value === 'object' && 'toDate' in value) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }
  return new Date().toISOString();
};

export const mapTransaction = (
  transactionId: string,
  householdId: string,
  source: Record<string, unknown>,
): Transaction => {
  return {
    id: transactionId,
    householdId,
    familyId: householdId,
    profileId: typeof source.profileId === 'string' ? source.profileId : undefined,
    profileName: typeof source.profileName === 'string' ? source.profileName : undefined,
    date: toIsoString(source.date),
    amountCents:
      typeof source.amountCents === 'number' && Number.isFinite(source.amountCents)
        ? Math.round(source.amountCents)
        : undefined,
    amount:
      typeof source.amount === 'number' && Number.isFinite(source.amount)
        ? source.amount
        : centsToDollars(
          typeof source.amountCents === 'number' && Number.isFinite(source.amountCents)
            ? Math.round(source.amountCents)
            : 0,
        ),
    memo: typeof source.memo === 'string' ? source.memo : '',
    type: source.type as Transaction['type'],
    status: source.status as any,
    category: source.category as any,
    taskId: typeof source.taskId === 'string' ? source.taskId : undefined,
    balanceAfterCents:
      typeof source.balanceAfterCents === 'number' && Number.isFinite(source.balanceAfterCents)
        ? Math.round(source.balanceAfterCents)
        : undefined,
    balanceAfter:
      typeof source.balanceAfter === 'number' && Number.isFinite(source.balanceAfter)
        ? source.balanceAfter
        : undefined,
  };
};

export const mapTask = (taskId: string, householdId: string, source: Record<string, unknown>): Task => {
  return {
    id: taskId,
    householdId,
    familyId: householdId,
    name: typeof source.name === 'string' ? source.name : 'Untitled Task',
    baselineMinutes: typeof source.baselineMinutes === 'number' ? source.baselineMinutes : 0,
    status: parseTaskStatus(source.status),
    rejectionComment: typeof source.rejectionComment === 'string' ? source.rejectionComment : undefined,
    assigneeId: typeof source.assigneeId === 'string' ? source.assigneeId : null,
    catalogItemId: typeof source.catalogItemId === 'string' ? source.catalogItemId : null,
    valueCents: typeof source.valueCents === 'number' ? source.valueCents : undefined,
    multiplier: typeof source.multiplier === 'number' ? source.multiplier : 1.0,
    bonusCents: typeof source.bonusCents === 'number' ? source.bonusCents : 0,
    emoji: typeof source.emoji === 'string' ? source.emoji : undefined,
    createdAt: typeof source.createdAt === 'string'
      ? source.createdAt
      : (source.createdAt && typeof source.createdAt === 'object' && 'toDate' in source.createdAt)
        ? (source.createdAt as { toDate: () => Date }).toDate().toISOString()
        : undefined,
  };
};

export const parseCurrencyInputToCents = (value: string): number => {
  const cleaned = value.replace(/[^0-9.]/g, '');
  const parsed = parseFloat(cleaned);
  if (isNaN(parsed)) return 0;
  return Math.round(parsed * 100);
};
