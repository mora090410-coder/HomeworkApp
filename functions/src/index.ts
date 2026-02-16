import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { logger } from 'firebase-functions';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { createHash } from 'crypto';
import { functionsConfig } from './config';

initializeApp();

const db = getFirestore();
const FUNCTION_REGION = 'us-central1';

type GradeScale = Record<string, number>;

interface SubjectEntry {
  grade?: string;
}

interface ValidateProfileSetupLinkRequest {
  householdId: string;
  profileId: string;
  token: string;
}

interface CompleteProfileSetupRequest {
  householdId: string;
  profileId: string;
  token: string;
  pin: string;
  avatarColor: string;
}

const defaultGradeScale: GradeScale = {
  'A+': 400,
  A: 375,
  'A-': 350,
  'B+': 325,
  B: 300,
  'B-': 275,
  'C+': 250,
  C: 225,
  'C-': 200,
  D: 125,
  F: 0,
};

const extractSubjects = (profileData: FirebaseFirestore.DocumentData, gradeData?: FirebaseFirestore.DocumentData): SubjectEntry[] => {
  if (gradeData && Array.isArray(gradeData.subjects)) {
    return gradeData.subjects as SubjectEntry[];
  }
  if (profileData && Array.isArray(profileData.subjects)) {
    return profileData.subjects as SubjectEntry[];
  }
  return [];
};

const deriveGradeScale = (gradeConfigData?: FirebaseFirestore.DocumentData): GradeScale => {
  if (!gradeConfigData) {
    return defaultGradeScale;
  }

  const scale: GradeScale = { ...defaultGradeScale };
  Object.keys(scale).forEach((gradeKey) => {
    const configuredValue = gradeConfigData[gradeKey];
    if (typeof configuredValue === 'number' && Number.isFinite(configuredValue)) {
      scale[gradeKey] = Math.round(configuredValue);
    }
  });

  return scale;
};

const calculateHourlyRateCents = (subjects: SubjectEntry[], gradeScale: GradeScale): number => {
  if (!subjects.length) {
    return 0;
  }

  return subjects.reduce((total, subject) => {
    if (!subject.grade || typeof subject.grade !== 'string') {
      return total;
    }

    return total + (gradeScale[subject.grade] ?? 0);
  }, 0);
};

const fetchLatestWeeklyGrades = async (householdId: string, profileId: string): Promise<FirebaseFirestore.DocumentData | undefined> => {
  const weeklyGradesRef = db.collection(`households/${householdId}/profiles/${profileId}/weekly_grades`);
  const latestSnapshot = await weeklyGradesRef.orderBy('createdAt', 'desc').limit(1).get();
  if (latestSnapshot.empty) {
    return undefined;
  }
  return latestSnapshot.docs[0].data();
};

const writeRateChangeLedgerEntries = async (params: {
  householdId: string;
  profileId: string;
  profileName: string;
  previousRateCents: number;
  nextRateCents: number;
}): Promise<void> => {
  const now = Timestamp.now();
  const memo = `System Transaction: Weekly hourly rate recalculation (${(params.previousRateCents / 100).toFixed(2)} -> ${(params.nextRateCents / 100).toFixed(2)})`;
  const payload = {
    householdId: params.householdId,
    profileId: params.profileId,
    profileName: params.profileName,
    amountCents: 0,
    amount: 0,
    type: 'ADJUSTMENT',
    memo,
    taskId: null,
    category: null,
    balanceAfterCents: null,
    balanceAfter: null,
    date: now,
    createdAt: now,
    isSystem: true,
  };

  const householdTransactionRef = db.collection(`households/${params.householdId}/transactions`).doc();
  const profileTransactionRef = db
    .collection(`households/${params.householdId}/profiles/${params.profileId}/transactions`)
    .doc(householdTransactionRef.id);

  await Promise.all([householdTransactionRef.set(payload), profileTransactionRef.set(payload)]);
};

const assertNonEmptyString = (value: unknown, field: string): string => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new HttpsError('invalid-argument', `${field} must be a non-empty string.`);
  }

  return value.trim();
};

const hashValue = (value: string, field: string): string => {
  const safeValue = assertNonEmptyString(value, field);
  return createHash('sha256').update(safeValue).digest('hex');
};

const readTimestampOrNull = (value: unknown): Timestamp | null => {
  return value instanceof Timestamp ? value : null;
};

export const validateProfileSetupLink = onCall(
  {
    region: FUNCTION_REGION,
  },
  async (request): Promise<{ householdId: string; profile: { id: string; name: string; avatarColor?: string } }> => {
    const payload = request.data as Partial<ValidateProfileSetupLinkRequest>;
    const householdId = assertNonEmptyString(payload.householdId, 'householdId');
    const profileId = assertNonEmptyString(payload.profileId, 'profileId');
    const token = assertNonEmptyString(payload.token, 'token');

    const profileRef = db.doc(`households/${householdId}/profiles/${profileId}`);
    const profileSnapshot = await profileRef.get();
    if (!profileSnapshot.exists) {
      throw new HttpsError('not-found', 'Profile setup link is invalid.');
    }

    const profileData = profileSnapshot.data() ?? {};
    const storedTokenHash = profileData.setupTokenHash;
    const expiresAt = readTimestampOrNull(profileData.setupTokenExpiresAt);
    const usedAt = readTimestampOrNull(profileData.setupTokenUsedAt);

    if (typeof storedTokenHash !== 'string' || storedTokenHash.length === 0) {
      throw new HttpsError('not-found', 'Profile setup link is invalid.');
    }
    if (!expiresAt || expiresAt.toMillis() < Date.now()) {
      throw new HttpsError('failed-precondition', 'Profile setup link has expired.');
    }
    if (usedAt) {
      throw new HttpsError('failed-precondition', 'Profile setup link has already been used.');
    }

    const candidateTokenHash = hashValue(token, 'token');
    if (candidateTokenHash !== storedTokenHash) {
      throw new HttpsError('permission-denied', 'Profile setup link is invalid.');
    }

    return {
      householdId,
      profile: {
        id: profileSnapshot.id,
        name: typeof profileData.name === 'string' ? profileData.name : 'Child',
        avatarColor: typeof profileData.avatarColor === 'string' ? profileData.avatarColor : undefined,
      },
    };
  },
);

export const completeProfileSetup = onCall(
  {
    region: FUNCTION_REGION,
  },
  async (request): Promise<{ success: true }> => {
    const payload = request.data as Partial<CompleteProfileSetupRequest>;
    const householdId = assertNonEmptyString(payload.householdId, 'householdId');
    const profileId = assertNonEmptyString(payload.profileId, 'profileId');
    const token = assertNonEmptyString(payload.token, 'token');
    const pin = assertNonEmptyString(payload.pin, 'pin');
    const avatarColor = assertNonEmptyString(payload.avatarColor, 'avatarColor');

    if (!/^\d{4}$/.test(pin)) {
      throw new HttpsError('invalid-argument', 'PIN must be exactly 4 digits.');
    }

    const pinHash = hashValue(pin, 'pin');
    const candidateTokenHash = hashValue(token, 'token');
    const profileRef = db.doc(`households/${householdId}/profiles/${profileId}`);

    await db.runTransaction(async (transaction) => {
      const profileSnapshot = await transaction.get(profileRef);
      if (!profileSnapshot.exists) {
        throw new HttpsError('not-found', 'Profile setup link is invalid.');
      }

      const profileData = profileSnapshot.data() ?? {};
      const storedTokenHash = profileData.setupTokenHash;
      const expiresAt = readTimestampOrNull(profileData.setupTokenExpiresAt);
      const usedAt = readTimestampOrNull(profileData.setupTokenUsedAt);

      if (typeof storedTokenHash !== 'string' || storedTokenHash.length === 0) {
        throw new HttpsError('not-found', 'Profile setup link is invalid.');
      }
      if (!expiresAt || expiresAt.toMillis() < Date.now()) {
        throw new HttpsError('failed-precondition', 'Profile setup link has expired.');
      }
      if (usedAt) {
        throw new HttpsError('failed-precondition', 'Profile setup link has already been used.');
      }
      if (candidateTokenHash !== storedTokenHash) {
        throw new HttpsError('permission-denied', 'Profile setup link is invalid.');
      }

      const now = Timestamp.now();
      transaction.update(profileRef, {
        pinHash,
        avatarColor,
        setupTokenHash: null,
        setupTokenUsedAt: now,
        setupStatus: 'SETUP_COMPLETE',
        setupCompletedAt: now,
        updatedAt: now,
      });
    });

    return { success: true };
  },
);

export const sundayNightRecalculation = onSchedule(
  {
    schedule: '0 21 * * 0',
    timeZone: functionsConfig.timezone,
    region: FUNCTION_REGION,
  },
  async () => {
    const householdsSnapshot = await db.collection('households').get();
    for (const householdDoc of householdsSnapshot.docs) {
      const householdId = householdDoc.id;
      const gradeConfigDoc = await db.doc(`households/${householdId}/settings/grade_configs`).get();
      const gradeScale = deriveGradeScale(gradeConfigDoc.exists ? gradeConfigDoc.data() : undefined);

      const childProfilesSnapshot = await db
        .collection(`households/${householdId}/profiles`)
        .where('role', '==', 'CHILD')
        .get();

      for (const profileDoc of childProfilesSnapshot.docs) {
        const profileData = profileDoc.data();
        const latestWeeklyGrades = await fetchLatestWeeklyGrades(householdId, profileDoc.id);
        const subjects = extractSubjects(profileData, latestWeeklyGrades);
        const nextRateCents = calculateHourlyRateCents(subjects, gradeScale);
        const previousRateCents =
          typeof profileData.currentHourlyRateCents === 'number'
            ? Math.round(profileData.currentHourlyRateCents)
            : 0;

        await profileDoc.ref.set(
          {
            currentHourlyRateCents: nextRateCents,
            currentHourlyRate: nextRateCents / 100,
            lastRateRecalculatedAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          },
          { merge: true },
        );

        await writeRateChangeLedgerEntries({
          householdId,
          profileId: profileDoc.id,
          profileName: typeof profileData.name === 'string' ? profileData.name : 'Child',
          previousRateCents,
          nextRateCents,
        });
      }
    }
  },
);

const getProfileTokens = async (householdId: string, profileId?: string | null): Promise<string[]> => {
  if (!profileId) {
    return [];
  }
  const profileSnapshot = await db.doc(`households/${householdId}/profiles/${profileId}`).get();
  if (!profileSnapshot.exists) {
    return [];
  }
  const profileData = profileSnapshot.data();
  if (!profileData || !Array.isArray(profileData.fcmTokens)) {
    return [];
  }
  return profileData.fcmTokens.filter((token: unknown): token is string => typeof token === 'string');
};

const getAdminTokens = async (householdId: string): Promise<string[]> => {
  const adminSnapshot = await db
    .collection(`households/${householdId}/profiles`)
    .where('role', '==', 'ADMIN')
    .get();
  const tokens = new Set<string>();
  adminSnapshot.docs.forEach((profileDoc) => {
    const data = profileDoc.data();
    if (Array.isArray(data.fcmTokens)) {
      data.fcmTokens.forEach((token: unknown) => {
        if (typeof token === 'string') {
          tokens.add(token);
        }
      });
    }
  });
  return [...tokens];
};

export const taskNotifications = onDocumentCreated(
  {
    document: 'households/{householdId}/notification_events/{eventId}',
    region: FUNCTION_REGION,
  },
  async (event) => {
    const payload = event.data?.data();
    if (!payload) {
      return;
    }

    const householdId = event.params.householdId;
    const taskId = typeof payload.taskId === 'string' ? payload.taskId : '';
    const targetProfileId = typeof payload.targetProfileId === 'string' ? payload.targetProfileId : null;
    const type = typeof payload.type === 'string' ? payload.type : '';
    if (!taskId || !type) {
      return;
    }

    const taskSnapshot = await db.doc(`households/${householdId}/tasks/${taskId}`).get();
    const taskData = taskSnapshot.exists ? taskSnapshot.data() : undefined;
    const taskName = typeof taskData?.name === 'string' ? taskData.name : 'Task';

    let tokens: string[] = [];
    let title = functionsConfig.appName;
    let body = 'You have a new update.';

    if (type === 'TASK_ASSIGNED') {
      tokens = await getProfileTokens(householdId, targetProfileId);
      title = 'New Task Assigned';
      body = `You were assigned: ${taskName}`;
    } else if (type === 'TASK_PENDING_APPROVAL') {
      tokens = await getAdminTokens(householdId);
      title = 'Task Waiting for Approval';
      body = `${taskName} is ready for review.`;
    } else if (type === 'TASK_PAID') {
      tokens = await getProfileTokens(householdId, targetProfileId);
      title = 'Task Approved and Paid';
      body = `Payment posted for: ${taskName}`;
    }

    if (!tokens.length) {
      logger.info('No FCM tokens available for notification event', { householdId, type, taskId });
      return;
    }

    await getMessaging().sendEachForMulticast({
      tokens,
      notification: {
        title,
        body,
      },
      data: {
        householdId,
        taskId,
        type,
      },
    });
  },
);
