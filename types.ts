export enum Grade {
  A_PLUS = 'A+',
  A = 'A',
  A_MINUS = 'A-',
  B_PLUS = 'B+',
  B = 'B',
  B_MINUS = 'B-',
  C_PLUS = 'C+',
  C = 'C',
  C_MINUS = 'C-',
  D = 'D',
  F = 'F',
}

export type Role = 'CHILD' | 'ADMIN' | 'MEMBER';

export type TaskStatus =
  | 'DRAFT'
  | 'OPEN'
  | 'ASSIGNED'
  | 'PENDING_APPROVAL'
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'DELETED';

export interface Household {
  id: string;
  name: string;
}

export type Family = Household;

export interface Subject {
  id: string;
  name: string;
  grade: Grade;
}

export interface StandardTask {
  id: string;
  name: string;
  baselineMinutes: number;
}

export interface Task {
  id: string;
  householdId: string;
  familyId?: string;
  name: string;
  baselineMinutes: number;
  status?: TaskStatus;
  rejectionComment?: string;
  assigneeId?: string | null;
}

export type AdvanceCategory =
  | 'Food/Drinks'
  | 'Entertainment'
  | 'Clothes'
  | 'School Supplies'
  | 'Toys/Games'
  | 'Other';

export interface Transaction {
  id: string;
  householdId: string;
  familyId?: string;
  date: string;
  amount: number;
  memo: string;
  type: 'EARNING' | 'ADVANCE';
  category?: AdvanceCategory;
  profileId?: string;
  profileName?: string;
}

export interface Profile {
  id: string;
  householdId: string;
  familyId?: string;
  name: string;
  role: Role;
  pinHash?: string;
  gradeLevel: string;
  subjects: Subject[];
  rates: Record<Grade, number>;
  balance: number;
}

export interface Child {
  id: string;
  householdId: string;
  familyId?: string;
  name: string;
  pin?: string;
  gradeLevel: string;
  subjects: Subject[];
  balance: number;
  history: Transaction[];
  customTasks: Task[];
  rates: Record<Grade, number>;
  role: Role;
}
