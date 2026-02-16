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
export type ProfileSetupStatus = 'PROFILE_CREATED' | 'INVITE_SENT' | 'SETUP_COMPLETE';

export type TaskStatus =
  | 'DRAFT'
  | 'OPEN'
  | 'ASSIGNED'
  | 'PENDING_APPROVAL'
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'DELETED';

export interface GradeConfig {
  grade: Grade;
  valueCents: number;
}

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
  catalogItemId?: string | null;
}

export interface ChoreCatalogItem {
  id: string;
  householdId: string;
  familyId?: string;
  name: string;
  baselineMinutes: number;
  createdAt?: string;
  updatedAt?: string;
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
  amountCents?: number;
  memo: string;
  type: 'EARNING' | 'ADVANCE' | 'ADJUSTMENT';
  category?: AdvanceCategory;
  profileId?: string;
  profileName?: string;
  taskId?: string;
  balanceAfter?: number;
  balanceAfterCents?: number;
}

export interface Profile {
  id: string;
  householdId: string;
  familyId?: string;
  name: string;
  role: Role;
  pinHash?: string;
  avatarColor?: string;
  gradeLevel: string;
  subjects: Subject[];
  rates: Record<Grade, number>;
  balance: number;
  balanceCents?: number;
  setupStatus?: ProfileSetupStatus;
  inviteLastSentAt?: string;
  setupCompletedAt?: string;
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
  balanceCents?: number;
  history: Transaction[];
  customTasks: Task[];
  rates: Record<Grade, number>;
  role: Role;
  setupStatus?: ProfileSetupStatus;
  inviteLastSentAt?: string;
  setupCompletedAt?: string;
}
