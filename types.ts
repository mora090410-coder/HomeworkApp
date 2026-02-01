
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
  F = 'F'
}

export type Role = 'CHILD' | 'ADMIN' | 'MEMBER';

export interface Family {
  id: string;
  name: string;
}

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
  familyId: string;
  name: string;
  baselineMinutes: number;
  status?: 'DRAFT' | 'OPEN' | 'ASSIGNED' | 'PENDING_APPROVAL' | 'PENDING_PAYMENT';
  rejectionComment?: string;
  assigneeId?: string | null; // Can be null for Drafts
}

export type AdvanceCategory = 'Food/Drinks' | 'Entertainment' | 'Clothes' | 'School Supplies' | 'Toys/Games' | 'Other';

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  memo: string;
  type: 'EARNING' | 'ADVANCE';
  category?: AdvanceCategory;
}

export interface Child {
  id: string;
  familyId: string;
  name: string;
  pin?: string; // New: 4-digit security PIN
  gradeLevel: string;
  subjects: Subject[];
  balance: number;
  history: Transaction[];
  customTasks: Task[];
  rates: Record<Grade, number>;
  role: Role;
}
