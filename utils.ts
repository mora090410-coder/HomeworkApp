
import { Subject, Grade } from './types';
import { GRADE_VALUES } from './constants';

export const calculateHourlyRate = (subjects: Subject[], rates: Record<Grade, number> = GRADE_VALUES): number => {
  if (!subjects.length) return 0;
  
  // Sum of all subject values
  return subjects.reduce((total, subject) => {
    return total + (rates[subject.grade] || 0);
  }, 0);
};

export const calculateTaskValue = (minutes: number, hourlyRate: number): number => {
  return (minutes / 60) * hourlyRate;
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount);
};

export const getNextGrade = (current: Grade): Grade => {
  const grades = Object.values(Grade);
  const index = grades.indexOf(current);
  return grades[(index + 1) % grades.length];
};

export const getTaskIcon = (name: string) => {
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
