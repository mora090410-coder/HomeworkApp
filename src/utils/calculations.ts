import { Grade, Subject, Task, Transaction } from '@/types';

export const roundToCents = (value: number): number => {
    return Math.round((value + Number.EPSILON) * 100);
};

export const normalizeCents = (value: number): number => {
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

/**
 * Calculates the overall hourly rate for a child based on their subject proficiency/grades.
 */
export const calculateHourlyRateFromGrades = (
    subjects: Subject[],
    rates: Record<Grade, number>,
): number => {
    if (!Array.isArray(subjects) || subjects.length === 0) {
        return 0;
    }

    const calculateHourlyRateCents = (
        subjects: Subject[],
        rates: Record<Grade, number>,
    ): number => {
        return subjects.reduce((totalCents, subject) => {
            const gradeRate = rates[subject.grade] ?? 0;
            return totalCents + dollarsToCents(gradeRate);
        }, 0);
    };

    return centsToDollars(calculateHourlyRateCents(subjects, rates));
};

/**
 * Calculates a task's effective hourly rate based on amount and duration.
 * This is the specific utility requested by the user.
 */
export const calculateEffectiveHourlyRate = (
    amount: number,
    durationMinutes: number
): number => {
    if (!durationMinutes || durationMinutes === 0) return 0;
    return (amount / durationMinutes) * 60;
};

export const calculateTaskValueCents = (
    minutes: number,
    hourlyRateCents: number,
    multiplier: number = 1.0,
    bonusCents: number = 0
): number => {
    if (!Number.isFinite(minutes) || minutes <= 0 || !Number.isFinite(hourlyRateCents) || hourlyRateCents <= 0) {
        return bonusCents || 0;
    }

    const baseValue = (normalizeCents(hourlyRateCents) * minutes) / 60;
    return Math.round(baseValue * (Number.isFinite(multiplier) ? multiplier : 1.0)) + (bonusCents || 0);
};

export const calculateTaskValue = (
    minutes: number,
    hourlyRate: number,
    multiplier: number = 1.0,
    bonusCents: number = 0
): number => {
    const cents = calculateTaskValueCents(minutes, dollarsToCents(hourlyRate), multiplier, bonusCents);
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
