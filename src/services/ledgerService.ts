import {
  Firestore,
  collection,
  doc,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { AdvanceCategory } from '@/types';
import { centsToDollars } from '@/utils';

interface LedgerBaseInput {
  firestore: Firestore;
  householdId: string;
  profileId: string;
  memo: string;
}

interface TaskPaymentInput extends LedgerBaseInput {
  taskId: string;
  amountCents: number;
}

interface AdvanceInput extends LedgerBaseInput {
  amountCents: number;
  category: AdvanceCategory;
}

interface AdjustmentInput extends LedgerBaseInput {
  amountCents: number;
}

interface LedgerMutationResult {
  transactionId: string;
  nextBalanceCents: number;
}

const assertNonEmptyString = (value: unknown, field: string): string => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${field} must be a non-empty string.`);
  }

  return value.trim();
};

const assertIntegerCents = (value: unknown, field: string): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${field} must be a finite number.`);
  }

  return Math.round(value);
};

const readBalanceCents = (profile: Record<string, unknown>): number => {
  if (typeof profile.balanceCents === 'number' && Number.isFinite(profile.balanceCents)) {
    return Math.round(profile.balanceCents);
  }

  if (typeof profile.balance === 'number' && Number.isFinite(profile.balance)) {
    return Math.round(profile.balance * 100);
  }

  return 0;
};

const buildTransactionPayload = (params: {
  householdId: string;
  profileId: string;
  amountCents: number;
  memo: string;
  type: 'EARNING' | 'ADVANCE' | 'ADJUSTMENT' | 'WITHDRAWAL_REQUEST' | 'GOAL_ALLOCATION';
  status?: 'PENDING' | 'PAID' | 'REJECTED';
  category?: AdvanceCategory;
  taskId?: string;
  goalId?: string;
  nextBalanceCents: number;
}) => {
  return {
    householdId: params.householdId,
    profileId: params.profileId,
    amountCents: params.amountCents,
    amount: centsToDollars(params.amountCents),
    memo: params.memo,
    type: params.type,
    status: params.status || (params.type === 'WITHDRAWAL_REQUEST' ? 'PENDING' : 'PAID'),
    category: params.category ?? null,
    taskId: params.taskId ?? null,
    goalId: params.goalId ?? null,
    balanceAfterCents: params.nextBalanceCents,
    balanceAfter: centsToDollars(params.nextBalanceCents),
    date: serverTimestamp(),
    createdAt: serverTimestamp(),
  };
};

const applyBalanceUpdate = (nextBalanceCents: number) => {
  return {
    balanceCents: nextBalanceCents,
    balance: centsToDollars(nextBalanceCents),
    updatedAt: serverTimestamp(),
  };
};

const applyLedgerMutation = async (params: {
  firestore: Firestore;
  householdId: string;
  profileId: string;
  amountCentsDelta: number;
  transactionAmountCents?: number;
  memo: string;
  type: 'EARNING' | 'ADVANCE' | 'ADJUSTMENT' | 'WITHDRAWAL_REQUEST' | 'GOAL_ALLOCATION';
  status?: 'PENDING' | 'PAID' | 'REJECTED';
  category?: AdvanceCategory;
  taskId?: string;
  goalId?: string;
  lockTaskAsPaid?: boolean;
}): Promise<LedgerMutationResult> => {
  const safeHouseholdId = assertNonEmptyString(params.householdId, 'householdId');
  const safeProfileId = assertNonEmptyString(params.profileId, 'profileId');
  const safeMemo = assertNonEmptyString(params.memo, 'memo');
  const safeAmountCents = assertIntegerCents(params.amountCentsDelta, 'amountCentsDelta');

  if (safeAmountCents === 0 && params.type !== 'WITHDRAWAL_REQUEST') {
    throw new Error('amountCentsDelta cannot be zero.');
  }

  let generatedTransactionId = '';
  let nextBalanceCents = 0;

  await runTransaction(params.firestore, async (transaction) => {
    const profileRef = doc(
      params.firestore,
      `households/${safeHouseholdId}/profiles/${safeProfileId}`,
    );
    const transactionRef = doc(collection(profileRef, 'transactions'));

    // 1. ALL READS FIRST
    const profileSnapshot = await transaction.get(profileRef);
    if (!profileSnapshot.exists()) {
      throw new Error('Profile not found.');
    }

    let taskRefToUpdate = null;
    let taskDataToLog = null;

    if (params.lockTaskAsPaid && params.taskId) {
      const profileTaskRef = doc(
        params.firestore,
        `households/${safeHouseholdId}/profiles/${safeProfileId}/tasks/${params.taskId}`,
      );
      let taskSnapshot = await transaction.get(profileTaskRef);
      let taskRef = profileTaskRef;

      if (!taskSnapshot.exists()) {
        const rootTaskRef = doc(
          params.firestore,
          `households/${safeHouseholdId}/tasks/${params.taskId}`,
        );
        taskSnapshot = await transaction.get(rootTaskRef);
        taskRef = rootTaskRef;
      }

      if (!taskSnapshot.exists()) {
        throw new Error('Task not found.');
      }

      const taskData = taskSnapshot.data() as Record<string, unknown>;
      const assigneeId = typeof taskData.assigneeId === 'string' ? taskData.assigneeId : null;
      if (assigneeId !== safeProfileId) {
        throw new Error('Task is not assigned to this child profile.');
      }
      if (taskData.status === 'PAID') {
        throw new Error('Task is already paid.');
      }

      taskRefToUpdate = taskRef;
      taskDataToLog = taskData;
    }

    // 2. NOW ALL WRITES
    const profileData = profileSnapshot.data() as Record<string, unknown>;
    const currentBalanceCents = readBalanceCents(profileData);
    nextBalanceCents = currentBalanceCents + safeAmountCents;

    // Special case for goal allocation: we need to update the goal object in the profile
    if (params.type === 'GOAL_ALLOCATION' && params.goalId) {
      const goals = (profileData.goals as any[]) || [];
      const goalIndex = goals.findIndex((g) => g.id === params.goalId);
      if (goalIndex === -1) {
        throw new Error('Goal not found.');
      }
      goals[goalIndex].currentAmountCents = (goals[goalIndex].currentAmountCents || 0) + Math.abs(safeAmountCents);
      transaction.update(profileRef, { goals });
    }

    generatedTransactionId = transactionRef.id;

    transaction.update(profileRef, applyBalanceUpdate(nextBalanceCents));
    transaction.set(
      transactionRef,
      buildTransactionPayload({
        householdId: safeHouseholdId,
        profileId: safeProfileId,
        amountCents: params.transactionAmountCents !== undefined ? params.transactionAmountCents : safeAmountCents,
        memo: safeMemo,
        type: params.type,
        status: params.status,
        category: params.category,
        taskId: params.taskId,
        goalId: params.goalId,
        nextBalanceCents,
      }),
    );

    if (taskRefToUpdate) {
      transaction.update(taskRefToUpdate, {
        status: 'PAID',
        updatedAt: serverTimestamp(),
        paidAt: serverTimestamp(),
      });
    }
  });

  return {
    transactionId: generatedTransactionId,
    nextBalanceCents,
  };
};

export const ledgerService = {
  async recordTaskPayment(input: TaskPaymentInput): Promise<LedgerMutationResult> {
    const safeTaskId = assertNonEmptyString(input.taskId, 'taskId');
    const safeAmountCents = assertIntegerCents(input.amountCents, 'amountCents');

    if (safeAmountCents <= 0) {
      throw new Error('amountCents must be a positive integer.');
    }

    return applyLedgerMutation({
      firestore: input.firestore,
      householdId: input.householdId,
      profileId: input.profileId,
      memo: input.memo,
      amountCentsDelta: safeAmountCents,
      type: 'EARNING',
      taskId: safeTaskId,
      lockTaskAsPaid: true,
    });
  },

  async recordAdvance(input: AdvanceInput): Promise<LedgerMutationResult> {
    const safeAmountCents = assertIntegerCents(input.amountCents, 'amountCents');
    if (safeAmountCents <= 0) {
      throw new Error('amountCents must be a positive integer.');
    }

    return applyLedgerMutation({
      firestore: input.firestore,
      householdId: input.householdId,
      profileId: input.profileId,
      memo: input.memo,
      amountCentsDelta: safeAmountCents * -1,
      type: 'ADVANCE',
      category: input.category,
    });
  },

  async recordManualAdjustment(input: AdjustmentInput): Promise<LedgerMutationResult> {
    return applyLedgerMutation({
      firestore: input.firestore,
      householdId: input.householdId,
      profileId: input.profileId,
      memo: input.memo,
      amountCentsDelta: input.amountCents,
      type: 'ADJUSTMENT',
    });
  },

  async recordWithdrawalRequest(input: LedgerBaseInput & { amountCents: number }): Promise<LedgerMutationResult> {
    const safeAmountCents = assertIntegerCents(input.amountCents, 'amountCents');
    if (safeAmountCents <= 0) {
      throw new Error('amountCents must be a positive integer.');
    }

    return applyLedgerMutation({
      firestore: input.firestore,
      householdId: input.householdId,
      profileId: input.profileId,
      memo: input.memo,
      amountCentsDelta: 0, // Lien logic: balance doesn't change yet
      transactionAmountCents: safeAmountCents,
      type: 'WITHDRAWAL_REQUEST',
    });
  },

  async recordGoalAllocation(input: LedgerBaseInput & { amountCents: number, goalId: string }): Promise<LedgerMutationResult> {
    const safeAmountCents = assertIntegerCents(input.amountCents, 'amountCents');
    if (safeAmountCents <= 0) {
      throw new Error('amountCents must be a positive integer.');
    }

    return applyLedgerMutation({
      firestore: input.firestore,
      householdId: input.householdId,
      profileId: input.profileId,
      memo: input.memo,
      amountCentsDelta: safeAmountCents * -1,
      type: 'GOAL_ALLOCATION',
      goalId: input.goalId,
    });
  },

  async finalizeWithdrawal(input: LedgerBaseInput & { transactionId: string, amountCents: number }): Promise<LedgerMutationResult> {
    const safeAmountCents = assertIntegerCents(input.amountCents, 'amountCents');
    const safeTransactionId = assertNonEmptyString(input.transactionId, 'transactionId');

    let nextBalanceCents = 0;

    await runTransaction(input.firestore, async (transaction) => {
      const profileRef = doc(input.firestore, `households/${input.householdId}/profiles/${input.profileId}`);
      const transactionRef = doc(profileRef, 'transactions', safeTransactionId);

      const [profileSnap, transSnap] = await Promise.all([
        transaction.get(profileRef),
        transaction.get(transactionRef)
      ]);

      if (!profileSnap.exists()) throw new Error('Profile not found.');
      if (!transSnap.exists()) throw new Error('Transaction not found.');

      const profileData = profileSnap.data() as Record<string, unknown>;
      const currentBalanceCents = readBalanceCents(profileData);
      nextBalanceCents = currentBalanceCents - safeAmountCents;

      transaction.update(profileRef, applyBalanceUpdate(nextBalanceCents));
      transaction.update(transactionRef, {
        status: 'PAID',
        balanceAfterCents: nextBalanceCents,
        balanceAfter: centsToDollars(nextBalanceCents),
        updatedAt: serverTimestamp(),
        paidAt: serverTimestamp(),
      });
    });

    return {
      transactionId: safeTransactionId,
      nextBalanceCents,
    };
  }
};
