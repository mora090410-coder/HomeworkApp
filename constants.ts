
import { Child, Grade } from './types';

// Fallback for types, though now we prefer the child-specific rates
export const GRADE_VALUES: Record<Grade, number> = {
  [Grade.A_PLUS]: 5.00,
  [Grade.A]: 4.75,
  [Grade.A_MINUS]: 4.50,
  [Grade.B_PLUS]: 4.25,
  [Grade.B]: 4.00,
  [Grade.B_MINUS]: 3.75,
  [Grade.C_PLUS]: 3.50,
  [Grade.C]: 0.00,
  [Grade.C_MINUS]: 0.00,
  [Grade.D]: 0.00,
  [Grade.F]: 0.00,
};

export const DEFAULT_RATES: Record<Grade, number> = {
  [Grade.A_PLUS]: 5.00,
  [Grade.A]: 4.75,
  [Grade.A_MINUS]: 4.50,
  [Grade.B_PLUS]: 4.25,
  [Grade.B]: 4.00,
  [Grade.B_MINUS]: 3.75,
  [Grade.C_PLUS]: 3.50,
  [Grade.C]: 0.00,
  [Grade.C_MINUS]: 0.00,
  [Grade.D]: 0.00,
  [Grade.F]: 0.00,
};

export const COMMON_TASKS = [
  { id: 't1', name: 'Vacuum Living Room', baselineMinutes: 20 },
  { id: 't2', name: 'Empty Dishwasher', baselineMinutes: 15 },
  { id: 't3', name: 'Fold Laundry', baselineMinutes: 30 },
  { id: 't4', name: 'Mow Lawn', baselineMinutes: 60 },
  { id: 't5', name: 'Walk Dog', baselineMinutes: 25 },
];

export const INITIAL_SUBJECTS = [
  { name: 'Math', grade: Grade.B },
  { name: 'English', grade: Grade.B },
  { name: 'Science', grade: Grade.B },
  { name: 'History', grade: Grade.B },
  { name: 'Art', grade: Grade.A },
];

export const INITIAL_DATA: Child[] = [];
