import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldPath, getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { logger } from 'firebase-functions';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { createHash } from 'crypto';
import { functionsConfig } from './config';
import { isUsernameFormatValid, normalizeUsernameForLookup } from './childAuthUtils';

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
  username: string;
}

interface ChildLoginRequest {
  username: string;
  pin: string;
  householdId?: string;
}

interface ChildLoginResponse {
  token: string;
  householdId: string;
  profileId: string;
  role: 'CHILD';
}

interface AdminResetChildPinRequest {
  householdId: string;
  profileId: string;
  newPin: string;
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

const assertObjectPayload = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new HttpsError('invalid-argument', 'Request payload must be an object.');
  }

  return value as Record<string, unknown>;
};

const readOptionalNonEmptyString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const safeValue = value.trim();
  return safeValue.length > 0 ? safeValue : undefined;
};

const extractHouseholdIdFromProfilePath = (path: string): string => {
  const segments = path.split('/');
  if (segments.length !== 4 || segments[0] !== 'households' || segments[2] !== 'profiles') {
    throw new HttpsError('internal', 'Profile path is malformed.');
  }

  return segments[1];
};

const resolveHouseholdIdForProfile = async (profileId: string): Promise<string> => {
  const matchingProfilesSnapshot = await db
    .collectionGroup('profiles')
    .where(FieldPath.documentId(), '==', profileId)
    .limit(2)
    .get();

  if (matchingProfilesSnapshot.empty) {
    throw new HttpsError('not-found', 'Profile setup link is invalid.');
  }

  if (matchingProfilesSnapshot.size > 1) {
    throw new HttpsError('failed-precondition', 'Profile setup link is ambiguous.');
  }

  return extractHouseholdIdFromProfilePath(matchingProfilesSnapshot.docs[0].ref.path);
};

const rethrowUnexpectedError = (context: string, error: unknown): never => {
  if (error instanceof HttpsError) {
    throw error;
  }

  logger.error(`${context} failed`, { error });
  throw new HttpsError('internal', `${context} failed.`);
};

const assertAuthenticatedUserId = (authPayload: unknown): string => {
  if (!authPayload || typeof authPayload !== 'object') {
    throw new HttpsError('unauthenticated', 'Authentication is required.');
  }

  const uid = (authPayload as { uid?: unknown }).uid;
  if (typeof uid !== 'string' || uid.trim().length === 0) {
    throw new HttpsError('unauthenticated', 'Authentication is required.');
  }

  return uid.trim();
};

const assertAdminMembership = async (userId: string, householdId: string): Promise<void> => {
  const membershipSnapshot = await db.doc(`users/${userId}/households/${householdId}`).get();
  if (!membershipSnapshot.exists) {
    throw new HttpsError('permission-denied', 'Admin membership is required.');
  }

  const role = membershipSnapshot.data()?.role;
  if (role !== 'ADMIN') {
    throw new HttpsError('permission-denied', 'Admin membership is required.');
  }
};

const resolveChildProfileByUsername = async (params: {
  username: string;
  householdId?: string;
}): Promise<{ householdId: string; profileId: string; pinHash: string }> => {
  const normalizedUsername = normalizeUsernameForLookup(assertNonEmptyString(params.username, 'username'));
  if (!isUsernameFormatValid(normalizedUsername)) {
    throw new HttpsError('invalid-argument', 'Username format is invalid.');
  }

  const requestedHouseholdId = readOptionalNonEmptyString(params.householdId);
  const profileSnapshot = await db
    .collectionGroup('profiles')
    .where('loginUsernameCanonical', '==', normalizedUsername)
    .limit(10)
    .get();

  const matches = profileSnapshot.docs
    .map((docSnapshot) => {
      const payload = docSnapshot.data();
      const role = payload.role;
      const pinHash = payload.pinHash;
      if (role !== 'CHILD' || typeof pinHash !== 'string' || pinHash.length === 0) {
        return null;
      }

      const householdId = extractHouseholdIdFromProfilePath(docSnapshot.ref.path);
      if (requestedHouseholdId && requestedHouseholdId !== householdId) {
        return null;
      }

      return {
        householdId,
        profileId: docSnapshot.id,
        pinHash,
      };
    })
    .filter((candidate): candidate is { householdId: string; profileId: string; pinHash: string } => {
      return candidate !== null;
    });

  if (matches.length === 0) {
    logger.warn('childLogin lookup: zero matches', {
      normalizedUsername,
      householdIdProvided: !!requestedHouseholdId,
      totalDocsScanned: profileSnapshot.size,
    });
    throw new HttpsError('not-found', 'No child profile matches that username.');
  }

  if (matches.length > 1) {
    logger.warn('childLogin lookup: ambiguous matches', {
      normalizedUsername,
      matchCount: matches.length,
      householdIdProvided: !!requestedHouseholdId,
    });
    throw new HttpsError(
      'failed-precondition',
      'Multiple profiles share that username. Contact your household admin.',
    );
  }

  return matches[0];
};

export const validateProfileSetupLink = onCall(
  {
    region: FUNCTION_REGION,
  },
  async (request): Promise<{
    householdId: string;
    profile: { id: string; name: string; avatarColor?: string; loginUsername?: string };
  }> => {
    try {
      const payload = assertObjectPayload(request.data);
      const profileId = assertNonEmptyString(payload.profileId, 'profileId');
      const token = assertNonEmptyString(payload.token, 'token');
      const requestedHouseholdId = readOptionalNonEmptyString(payload.householdId);
      const householdId = requestedHouseholdId ?? (await resolveHouseholdIdForProfile(profileId));

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
          loginUsername:
            typeof profileData.loginUsername === 'string' ? profileData.loginUsername : undefined,
        },
      };
    } catch (error) {
      return rethrowUnexpectedError('validateProfileSetupLink', error);
    }
  },
);

export const completeProfileSetup = onCall(
  {
    region: FUNCTION_REGION,
  },
  async (request): Promise<{ success: true }> => {
    try {
      const payload = assertObjectPayload(request.data);
      const profileId = assertNonEmptyString(payload.profileId, 'profileId');
      const token = assertNonEmptyString(payload.token, 'token');
      const pin = assertNonEmptyString(payload.pin, 'pin');
      const avatarColor = assertNonEmptyString(payload.avatarColor, 'avatarColor');
      const username = normalizeUsernameForLookup(assertNonEmptyString(payload.username, 'username'));
      const requestedHouseholdId = readOptionalNonEmptyString(payload.householdId);
      const householdId = requestedHouseholdId ?? (await resolveHouseholdIdForProfile(profileId));

      if (!/^\d{4}$/.test(pin)) {
        throw new HttpsError('invalid-argument', 'PIN must be exactly 4 digits.');
      }
      if (!isUsernameFormatValid(username)) {
        throw new HttpsError(
          'invalid-argument',
          'Username must be 3-24 characters and use letters, numbers, dot, dash, or underscore.',
        );
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

        const existingUsernameSnapshot = await transaction.get(
          db
            .collection(`households/${householdId}/profiles`)
            .where('loginUsernameCanonical', '==', username)
            .limit(2),
        );
        const hasConflict = existingUsernameSnapshot.docs.some((docSnapshot) => docSnapshot.id !== profileId);
        if (hasConflict) {
          throw new HttpsError('already-exists', 'Username is already taken in this household.');
        }

        const now = Timestamp.now();
        transaction.update(profileRef, {
          pinHash,
          loginUsername: username,
          loginUsernameCanonical: username,
          avatarColor,
          setupTokenHash: null,
          setupTokenUsedAt: now,
          setupStatus: 'SETUP_COMPLETE',
          setupCompletedAt: now,
          updatedAt: now,
        });
      });

      return { success: true };
    } catch (error) {
      return rethrowUnexpectedError('completeProfileSetup', error);
    }
  },
);

export const childLogin = onCall(
  {
    region: FUNCTION_REGION,
  },
  async (request): Promise<ChildLoginResponse> => {
    try {
      const payload = assertObjectPayload(request.data);
      const pin = assertNonEmptyString(payload.pin, 'pin');
      const username = assertNonEmptyString(payload.username, 'username');
      const householdId = readOptionalNonEmptyString(payload.householdId);

      if (!/^\d{4}$/.test(pin)) {
        throw new HttpsError('invalid-argument', 'PIN must be exactly 4 digits.');
      }

      const resolvedProfile = await resolveChildProfileByUsername({
        username,
        householdId,
      });
      const candidatePinHash = hashValue(pin, 'pin');
      if (candidatePinHash !== resolvedProfile.pinHash) {
        logger.warn('childLogin: PIN mismatch', {
          username,
          householdId: resolvedProfile.householdId,
          profileId: resolvedProfile.profileId,
        });
        throw new HttpsError('permission-denied', 'Username or PIN is incorrect.');
      }

      const token = await getAuth().createCustomToken(
        `child:${resolvedProfile.householdId}:${resolvedProfile.profileId}`,
        {
          role: 'CHILD',
          householdId: resolvedProfile.householdId,
          profileId: resolvedProfile.profileId,
        },
      );

      return {
        token,
        householdId: resolvedProfile.householdId,
        profileId: resolvedProfile.profileId,
        role: 'CHILD',
      };
    } catch (error) {
      return rethrowUnexpectedError('childLogin', error);
    }
  },
);

export const adminResetChildPin = onCall(
  {
    region: FUNCTION_REGION,
  },
  async (request): Promise<{ success: true }> => {
    try {
      const userId = assertAuthenticatedUserId(request.auth);
      const payload = assertObjectPayload(request.data);
      const householdId = assertNonEmptyString(payload.householdId, 'householdId');
      const profileId = assertNonEmptyString(payload.profileId, 'profileId');
      const newPin = assertNonEmptyString(payload.newPin, 'newPin');

      if (!/^\d{4}$/.test(newPin)) {
        throw new HttpsError('invalid-argument', 'newPin must be exactly 4 digits.');
      }

      await assertAdminMembership(userId, householdId);

      const profileRef = db.doc(`households/${householdId}/profiles/${profileId}`);
      const profileSnapshot = await profileRef.get();
      if (!profileSnapshot.exists) {
        throw new HttpsError('not-found', 'Child profile not found.');
      }

      const role = profileSnapshot.data()?.role;
      if (role !== 'CHILD') {
        throw new HttpsError('failed-precondition', 'Target profile must be a child.');
      }

      await profileRef.update({
        pinHash: hashValue(newPin, 'newPin'),
        updatedAt: Timestamp.now(),
      });

      return { success: true };
    } catch (error) {
      return rethrowUnexpectedError('adminResetChildPin', error);
    }
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
