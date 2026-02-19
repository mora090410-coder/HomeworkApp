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
  type: 'EARNING' | 'ADVANCE' | 'ADJUSTMENT';
  category?: AdvanceCategory;
  taskId?: string;
  nextBalanceCents: number;
}) => {
  return {
    householdId: params.householdId,
    profileId: params.profileId,
    amountCents: params.amountCents,
    amount: centsToDollars(params.amountCents),
    memo: params.memo,
    type: params.type,
    category: params.category ?? null,
    taskId: params.taskId ?? null,
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
  memo: string;
  type: 'EARNING' | 'ADVANCE' | 'ADJUSTMENT';
  category?: AdvanceCategory;
  taskId?: string;
  lockTaskAsPaid?: boolean;
}): Promise<LedgerMutationResult> => {
  const safeHouseholdId = assertNonEmptyString(params.householdId, 'householdId');
  const safeProfileId = assertNonEmptyString(params.profileId, 'profileId');
  const safeMemo = assertNonEmptyString(params.memo, 'memo');
  const safeAmountCents = assertIntegerCents(params.amountCentsDelta, 'amountCentsDelta');

  if (safeAmountCents === 0) {
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
    const profileSnapshot = await transaction.get(profileRef);

    if (!profileSnapshot.exists()) {
      throw new Error('Profile not found.');
    }

    const profileData = profileSnapshot.data() as Record<string, unknown>;
    const currentBalanceCents = readBalanceCents(profileData);
    nextBalanceCents = currentBalanceCents + safeAmountCents;
    generatedTransactionId = transactionRef.id;

    transaction.update(profileRef, applyBalanceUpdate(nextBalanceCents));
    transaction.set(
      transactionRef,
      buildTransactionPayload({
        householdId: safeHouseholdId,
        profileId: safeProfileId,
        amountCents: safeAmountCents,
        memo: safeMemo,
        type: params.type,
        category: params.category,
        taskId: params.taskId,
        nextBalanceCents,
      }),
    );

    if (params.lockTaskAsPaid && params.taskId) {
      // Check profile sub-collection first (assigned tasks), then root (open tasks).
      const profileTaskRef = doc(
        params.firestore,
        `households/${safeHouseholdId}/profiles/${safeProfileId}/tasks/${params.taskId}`,
      );
      let taskRef = profileTaskRef;
      let taskSnapshot = await transaction.get(profileTaskRef);

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

      transaction.update(taskRef, {
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
};
