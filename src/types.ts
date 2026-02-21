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
  | 'PENDING_WITHDRAWAL'
  | 'PAID'
  | 'REJECTED'
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
  valueCents?: number;
  createdAt?: string;
  isRecurring?: boolean;
  multiplier?: number; // 1.0 default
  bonusCents?: number; // Extra manually added value
  emoji?: string;
}

export interface ChoreCatalogItem {
  id: string;
  householdId: string;
  familyId?: string;
  name: string;
  baselineMinutes: number;
  isRecurring?: boolean;
  multiplier?: number; // 1.0 default
  valueCents?: number;
  createdAt?: string;
  updatedAt?: string;
  emoji?: string;
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
  type: 'EARNING' | 'ADVANCE' | 'ADJUSTMENT' | 'WITHDRAWAL_REQUEST' | 'GOAL_ALLOCATION';
  status?: 'PENDING' | 'PAID' | 'REJECTED';
  category?: AdvanceCategory;
  profileId?: string;
  profileName?: string;
  taskId?: string;
  balanceAfter?: number;
  balanceAfterCents?: number;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmountCents: number;
  currentAmountCents: number;
  status: 'ACTIVE' | 'CLAIMED';
  createdAt?: string;
}

export interface Profile {
  id: string;
  householdId: string;
  familyId?: string;
  name: string;
  role: Role;
  pinHash?: string;
  loginUsername?: string;
  loginUsernameCanonical?: string;
  avatarColor?: string;
  gradeLevel: string;
  subjects: Subject[];
  rates: Record<Grade, number>;
  currentHourlyRate: number;
  balance: number;
  balanceCents?: number;
  goals?: SavingsGoal[];
  setupStatus?: ProfileSetupStatus;
  inviteLastSentAt?: string | null;
  setupCompletedAt?: string | null;
}

export interface Child {
  id: string;
  householdId: string;
  familyId?: string;
  name: string;
  avatarColor?: string;
  pin?: string;
  loginUsername?: string;
  loginUsernameCanonical?: string;
  gradeLevel: string;
  subjects: Subject[];
  balance: number;
  balanceCents?: number;
  history?: Transaction[];
  goals?: SavingsGoal[];
  customTasks: Task[];
  rates: Record<Grade, number>;
  currentHourlyRate: number;
  role: Role;
  setupStatus?: ProfileSetupStatus;
  inviteLastSentAt?: string | null;
  setupCompletedAt?: string | null;
}
