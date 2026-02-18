import { GRADE_VALUES } from '@/constants';
import { Grade, GradeConfig, Subject, Task, TaskStatus, Transaction } from '@/types';

const DEFAULT_RATE_MAP: Record<Grade, number> = GRADE_VALUES;

const roundToCents = (value: number): number => {
  return Math.round((value + Number.EPSILON) * 100);
};

const normalizeCents = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.round(value);
};

export const dollarsToCents = (amount: number): number => {
  return roundToCents(amount);
};

export const centsToDollars = (amountCents: number): number => {
  return normalizeCents(amountCents) / 100;
};

export const parseCurrencyInputToCents = (value: string): number => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return 0;
  }

  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return dollarsToCents(parsed);
};

export const buildRateMapFromGradeConfigs = (
  gradeConfigs: GradeConfig[] | undefined,
  fallbackRates: Record<Grade, number> = DEFAULT_RATE_MAP,
): Record<Grade, number> => {
  const fallbackCents = Object.values(Grade).reduce((accumulator, grade) => {
    accumulator[grade] = dollarsToCents(fallbackRates[grade] ?? 0);
    return accumulator;
  }, {} as Record<Grade, number>);

  if (!Array.isArray(gradeConfigs) || gradeConfigs.length === 0) {
    return Object.values(Grade).reduce((accumulator, grade) => {
      accumulator[grade] = centsToDollars(fallbackCents[grade]);
      return accumulator;
    }, {} as Record<Grade, number>);
  }

  const configuredCents = gradeConfigs.reduce((accumulator, config) => {
    if (Object.values(Grade).includes(config.grade)) {
      accumulator[config.grade] = normalizeCents(config.valueCents);
    }

    return accumulator;
  }, { ...fallbackCents });

  return Object.values(Grade).reduce((accumulator, grade) => {
    accumulator[grade] = centsToDollars(configuredCents[grade]);
    return accumulator;
  }, {} as Record<Grade, number>);
};

export const calculateHourlyRateCents = (
  subjects: Subject[],
  rates: Record<Grade, number> = DEFAULT_RATE_MAP,
): number => {
  if (!Array.isArray(subjects) || subjects.length === 0) {
    return 0;
  }

  return subjects.reduce((totalCents, subject) => {
    const gradeRate = rates[subject.grade] ?? 0;
    return totalCents + dollarsToCents(gradeRate);
  }, 0);
};

export const calculateHourlyRate = (
  subjects: Subject[],
  rates: Record<Grade, number> = DEFAULT_RATE_MAP,
): number => {
  return centsToDollars(calculateHourlyRateCents(subjects, rates));
};

export const calculateTaskValueCents = (minutes: number, hourlyRateCents: number): number => {
  if (!Number.isFinite(minutes) || minutes <= 0 || !Number.isFinite(hourlyRateCents) || hourlyRateCents <= 0) {
    return 0;
  }

  return Math.round((normalizeCents(hourlyRateCents) * minutes) / 60);
};

export const calculateTaskValue = (minutes: number, hourlyRate: number): number => {
  const cents = calculateTaskValueCents(minutes, dollarsToCents(hourlyRate));
  return centsToDollars(cents);
};

export const getTransactionAmountCents = (transaction: Transaction): number => {
  if (typeof transaction.amountCents === 'number' && Number.isFinite(transaction.amountCents)) {
    return normalizeCents(transaction.amountCents);
  }

  return dollarsToCents(transaction.amount);
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
};

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
  };
};
