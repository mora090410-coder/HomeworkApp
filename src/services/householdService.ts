import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import {
  AdvanceCategory,
  ChoreCatalogItem,
  Child,
  Grade,
  GradeConfig,
  Household,
  Profile,
  ProfileSetupStatus,
  Role,
  Subject,
  Task,
  TaskStatus,
  Transaction,
} from '@/types';
import { isValidChildUsername, normalizeChildUsername } from '@/features/auth/childCredentials';
import { auth, db, ensureFirebaseConfigured, functions } from '@/services/firebase';
import { ledgerService } from '@/services/ledgerService';
import { centsToDollars, dollarsToCents, mapTask, parseTaskStatus } from '@/utils';

const ACTIVE_PROFILE_STORAGE_KEY = 'homework-active-profile';
const DEFAULT_INVITE_EXPIRY_HOURS = 24;
const DEFAULT_ACTIVITY_LIMIT = 10;
const DEFAULT_PROFILE_SETUP_EXPIRY_HOURS = 24;
const CALLABLE_RETRY_LIMIT = 3;
const CALLABLE_BACKOFF_BASE_MS = 250;

interface ValidateProfileSetupLinkRequest {
  profileId: string;
  token: string;
  householdId?: string;
}

interface ValidateProfileSetupLinkResponse {
  householdId: string;
  profile: {
    id: string;
    name: string;
    avatarColor?: string;
    loginUsername?: string;
  };
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

type FirestoreProfile = Omit<Profile, 'id' | 'familyId'>;

type FirestoreTask = Omit<Task, 'id' | 'familyId'>;

interface StoredActiveProfile {
  householdId?: string;
  familyId?: string;
  profileId?: string;
  role?: Role;
}

interface HouseholdMembership {
  householdId: string;
  role: Role;
  profileId: string | null;
}

const getFirestore = () => {
  ensureFirebaseConfigured('Firestore');

  if (!db) {
    throw new Error('Firestore is unavailable. Firebase is not initialized.');
  }

  return db;
};

const normalizeError = (context: string, error: unknown): Error => {
  if (error instanceof Error) {
    const wrapped = new Error(`${context}: ${error.message}`);
    if ('code' in error && typeof (error as Record<string, unknown>).code === 'string') {
      (wrapped as Error & { code: string }).code = (error as Error & { code: string }).code;
    }
    return wrapped;
  }

  return new Error(`${context}: Unknown error`);
};

const sleep = (durationMs: number): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });
};

const getCallableErrorCode = (error: unknown): string | null => {
  if (!error || typeof error !== 'object') {
    return null;
  }

  const code = (error as { code?: unknown }).code;
  if (typeof code !== 'string' || code.length === 0) {
    return null;
  }

  if (code.startsWith('functions/')) {
    return code.slice('functions/'.length);
  }

  return code;
};

const isRetryableCallableError = (error: unknown): boolean => {
  const code = getCallableErrorCode(error);
  if (!code) {
    return false;
  }

  return (
    code === 'unavailable' ||
    code === 'deadline-exceeded' ||
    code === 'resource-exhausted' ||
    code === 'aborted' ||
    code === 'internal'
  );
};

const callWithExponentialBackoff = async <TResult>(operation: () => Promise<TResult>): Promise<TResult> => {
  let attempt = 0;
  while (attempt < CALLABLE_RETRY_LIMIT) {
    try {
      return await operation();
    } catch (error) {
      attempt += 1;
      const shouldRetry = isRetryableCallableError(error) && attempt < CALLABLE_RETRY_LIMIT;
      if (!shouldRetry) {
        throw error;
      }

      const backoffMs = CALLABLE_BACKOFF_BASE_MS * 2 ** (attempt - 1);
      const jitterMs = Math.floor(Math.random() * CALLABLE_BACKOFF_BASE_MS);
      await sleep(backoffMs + jitterMs);
    }
  }

  throw new Error('Callable operation failed unexpectedly.');
};

const readStoredActiveProfile = (): StoredActiveProfile | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(ACTIVE_PROFILE_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as StoredActiveProfile;
    return parsed;
  } catch {
    return null;
  }
};

const assertNonEmptyString = (value: unknown, field: string): string => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${field} must be a non-empty string.`);
  }

  return value.trim();
};

export const buildChildLoginPayload = (input: {
  username: string;
  pin: string;
  householdId?: string;
}): ChildLoginRequest => {
  const username = normalizeChildUsername(assertNonEmptyString(input.username, 'username'));
  const pin = assertNonEmptyString(input.pin, 'pin');
  const householdId =
    typeof input.householdId === 'string' && input.householdId.trim().length > 0
      ? input.householdId.trim()
      : undefined;

  if (!isValidChildUsername(username)) {
    throw new Error('username must be 3-24 characters and use letters, numbers, dot, dash, or underscore.');
  }

  if (!/^\d{4}$/.test(pin)) {
    throw new Error('PIN must be exactly 4 digits.');
  }

  return {
    username,
    pin,
    householdId,
  };
};

export const buildAdminResetPinPayload = (input: {
  householdId: string;
  profileId: string;
  newPin: string;
}): AdminResetChildPinRequest => {
  const householdId = assertNonEmptyString(input.householdId, 'householdId');
  const profileId = assertNonEmptyString(input.profileId, 'profileId');
  const newPin = assertNonEmptyString(input.newPin, 'newPin');

  if (!/^\d{4}$/.test(newPin)) {
    throw new Error('newPin must be exactly 4 digits.');
  }

  return {
    householdId,
    profileId,
    newPin,
  };
};

const hashPin = async (pin: string): Promise<string> => {
  const safePin = assertNonEmptyString(pin, 'pin');
  const payload = new TextEncoder().encode(safePin);
  const digest = await crypto.subtle.digest('SHA-256', payload);
  const bytes = Array.from(new Uint8Array(digest));
  return bytes.map((byte) => byte.toString(16).padStart(2, '0')).join('');
};

const hashToken = async (token: string): Promise<string> => {
  const safeToken = assertNonEmptyString(token, 'token');
  const payload = new TextEncoder().encode(safeToken);
  const digest = await crypto.subtle.digest('SHA-256', payload);
  const bytes = Array.from(new Uint8Array(digest));
  return bytes.map((byte) => byte.toString(16).padStart(2, '0')).join('');
};

const toIsoString = (value: unknown): string => {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'string' && value.length > 0) {
    return value;
  }

  return new Date().toISOString();
};

const toNullableIsoString = (value: unknown): string | null => {
  if (value === null || typeof value === 'undefined') {
    return null;
  }

  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'string' && value.length > 0) {
    return value;
  }

  return null;
};

const parseRole = (value: unknown): Role => {
  if (value === 'ADMIN' || value === 'CHILD' || value === 'MEMBER') {
    return value;
  }

  return 'MEMBER';
};

const parseProfileSetupStatus = (value: unknown): ProfileSetupStatus => {
  if (value === 'PROFILE_CREATED' || value === 'INVITE_SENT' || value === 'SETUP_COMPLETE') {
    return value;
  }

  return 'PROFILE_CREATED';
};



const parseAdvanceCategory = (value: unknown): AdvanceCategory | undefined => {
  const supported: AdvanceCategory[] = [
    'Food/Drinks',
    'Entertainment',
    'Clothes',
    'School Supplies',
    'Toys/Games',
    'Other',
  ];

  if (typeof value === 'string' && supported.includes(value as AdvanceCategory)) {
    return value as AdvanceCategory;
  }

  return undefined;
};

const parseSubjects = (value: unknown): Subject[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((subject) => {
      if (!subject || typeof subject !== 'object') {
        return null;
      }

      const subjectRecord = subject as Record<string, unknown>;
      const id = typeof subjectRecord.id === 'string' ? subjectRecord.id : crypto.randomUUID();
      const name = typeof subjectRecord.name === 'string' ? subjectRecord.name : 'Unknown Subject';
      const grade = Object.values(Grade).includes(subjectRecord.grade as Grade)
        ? (subjectRecord.grade as Grade)
        : Grade.C;

      return {
        id,
        name,
        grade,
      };
    })
    .filter((subject): subject is Subject => subject !== null);
};

const defaultRates = (): Record<Grade, number> => {
  return Object.values(Grade).reduce((accumulator, grade) => {
    accumulator[grade] = 0;
    return accumulator;
  }, {} as Record<Grade, number>);
};

const parseRates = (value: unknown): Record<Grade, number> => {
  const fallback = defaultRates();

  if (!value || typeof value !== 'object') {
    return fallback;
  }

  const source = value as Record<string, unknown>;

  return Object.values(Grade).reduce((accumulator, grade) => {
    const candidate = source[grade];
    accumulator[grade] = typeof candidate === 'number' && Number.isFinite(candidate) ? candidate : fallback[grade];
    return accumulator;
  }, {} as Record<Grade, number>);
};

const parseBalanceCents = (source: Record<string, unknown>): number => {
  if (typeof source.balanceCents === 'number' && Number.isFinite(source.balanceCents)) {
    return Math.round(source.balanceCents);
  }

  if (typeof source.balance === 'number' && Number.isFinite(source.balance)) {
    return dollarsToCents(source.balance);
  }

  return 0;
};

const mapGradeConfigs = (
  source: Record<string, unknown>,
  fallbackRates: Record<Grade, number>,
): GradeConfig[] => {
  return Object.values(Grade).map((grade) => {
    const rawCents = source[grade];
    if (typeof rawCents === 'number' && Number.isFinite(rawCents)) {
      return { grade, valueCents: Math.round(rawCents) };
    }

    return {
      grade,
      valueCents: dollarsToCents(fallbackRates[grade] ?? 0),
    };
  });
};

export const createProfileWritePayload = (input: {
  householdId: string;
  name: string;
  avatarColor?: string;
  gradeLevel?: string;
  subjects?: Subject[];
  rates?: Record<Grade, number>;
  currentHourlyRate?: number;
  pinHash?: string;
}): FirestoreProfile => ({
  householdId: input.householdId,
  name: input.name,
  role: 'CHILD',
  pinHash: input.pinHash ?? '',
  avatarColor: input.avatarColor ?? '#3b82f6',
  gradeLevel: input.gradeLevel ?? 'Unknown',
  subjects: input.subjects ?? [],
  rates: input.rates ?? defaultRates(),
  currentHourlyRate: input.currentHourlyRate ?? 0,
  balanceCents: 0,
  balance: 0,
  setupStatus: 'PROFILE_CREATED',
  inviteLastSentAt: null,
  setupCompletedAt: null,
});

const mapProfile = (profileId: string, householdId: string, source: Record<string, unknown>): Profile => {
  const balanceCents = parseBalanceCents(source);

  return {
    id: profileId,
    householdId,
    familyId: householdId,
    name: typeof source.name === 'string' ? source.name : 'Unknown Profile',
    role: parseRole(source.role),
    pinHash: typeof source.pinHash === 'string' ? source.pinHash : undefined,
    loginUsername: typeof source.loginUsername === 'string' ? source.loginUsername : undefined,
    loginUsernameCanonical:
      typeof source.loginUsernameCanonical === 'string' ? source.loginUsernameCanonical : undefined,
    avatarColor: typeof source.avatarColor === 'string' ? source.avatarColor : undefined,
    gradeLevel: typeof source.gradeLevel === 'string' ? source.gradeLevel : 'Unknown',
    subjects: parseSubjects(source.subjects),
    rates: parseRates(source.rates),
    currentHourlyRate: typeof source.currentHourlyRate === 'number' ? source.currentHourlyRate : 0,
    // standardize: treat balanceCents as the single source of truth for bank balance.
    // balance is always a derived view, even for negative values (advances).
    balanceCents,
    balance: centsToDollars(balanceCents),
    goals: Array.isArray(source.goals)
      ? source.goals.map((goal: any) => ({
        id: goal.id,
        name: goal.name,
        targetAmountCents: goal.targetAmountCents,
        currentAmountCents: goal.currentAmountCents,
        status: goal.status,
        createdAt: toNullableIsoString(goal.createdAt),
      }))
      : [],
    setupStatus: parseProfileSetupStatus(source.setupStatus),
    inviteLastSentAt: toNullableIsoString(source.inviteLastSentAt),
    setupCompletedAt: toNullableIsoString(source.setupCompletedAt),
  };
};

const mapSetupProfileFromCallable = (
  householdId: string,
  source: ValidateProfileSetupLinkResponse['profile'],
): Profile => {
  return {
    id: source.id,
    householdId,
    familyId: householdId,
    name: source.name,
    role: 'CHILD',
    loginUsername: source.loginUsername,
    loginUsernameCanonical: source.loginUsername
      ? normalizeChildUsername(source.loginUsername)
      : undefined,
    avatarColor: source.avatarColor,
    gradeLevel: 'Unknown',
    subjects: [],
    rates: defaultRates(),
    currentHourlyRate: 0,
    balanceCents: 0,
    balance: 0,
    setupStatus: 'INVITE_SENT',
    inviteLastSentAt: null,
    setupCompletedAt: null,
  };
};



const mapTransaction = (
  transactionId: string,
  householdId: string,
  source: Record<string, unknown>,
): Transaction => {
  return {
    id: transactionId,
    householdId,
    familyId: householdId,
    profileId: typeof source.profileId === 'string' ? source.profileId : undefined,
    profileName: typeof source.profileName === 'string' ? source.profileName : undefined,
    date: toIsoString(source.date),
    amountCents:
      typeof source.amountCents === 'number' && Number.isFinite(source.amountCents)
        ? Math.round(source.amountCents)
        : undefined,
    amount:
      typeof source.amount === 'number' && Number.isFinite(source.amount)
        ? source.amount
        : centsToDollars(
          typeof source.amountCents === 'number' && Number.isFinite(source.amountCents)
            ? Math.round(source.amountCents)
            : 0,
        ),
    memo: typeof source.memo === 'string' ? source.memo : '',
    type:
      source.type === 'ADVANCE' || source.type === 'ADJUSTMENT' || source.type === 'EARNING'
        || source.type === 'WITHDRAWAL_REQUEST' || source.type === 'GOAL_ALLOCATION'
        ? source.type
        : 'EARNING',
    category: parseAdvanceCategory(source.category),
    taskId: typeof source.taskId === 'string' ? source.taskId : undefined,
    balanceAfterCents:
      typeof source.balanceAfterCents === 'number' && Number.isFinite(source.balanceAfterCents)
        ? Math.round(source.balanceAfterCents)
        : undefined,
    balanceAfter:
      typeof source.balanceAfter === 'number' && Number.isFinite(source.balanceAfter)
        ? source.balanceAfter
        : undefined,
  };
};

const getProfilesCollectionRef = (householdId: string) => {
  const firestore = getFirestore();
  return collection(firestore, `households/${householdId}/profiles`);
};

const getTasksCollectionRef = (householdId: string) => {
  const firestore = getFirestore();
  return collection(firestore, `households/${householdId}/tasks`);
};

const getTransactionsCollectionRef = (householdId: string) => {
  const firestore = getFirestore();
  return collection(firestore, `households/${householdId}/transactions`);
};

const getChoreCatalogCollectionRef = (householdId: string) => {
  const firestore = getFirestore();
  return collection(firestore, `households/${householdId}/chore_catalog`);
};

const getProfileTransactionsCollectionRef = (householdId: string, profileId: string) => {
  const firestore = getFirestore();
  return collection(firestore, `households/${householdId}/profiles/${profileId}/transactions`);
};

const getCandidateHouseholdIds = async (householdId?: string): Promise<string[]> => {
  const candidateHouseholdIds = new Set<string>();
  const addCandidateHouseholdId = (candidateId?: string) => {
    if (typeof candidateId !== 'string') {
      return;
    }

    const trimmedCandidateId = candidateId.trim();
    if (trimmedCandidateId.length === 0) {
      return;
    }

    candidateHouseholdIds.add(trimmedCandidateId);
  };

  addCandidateHouseholdId(householdId);

  const storedProfile = readStoredActiveProfile();
  addCandidateHouseholdId(storedProfile?.householdId);
  addCandidateHouseholdId(storedProfile?.familyId);

  const currentUserId = auth?.currentUser?.uid;
  if (currentUserId) {
    try {
      const firestore = getFirestore();
      const membershipsSnapshot = await getDocs(collection(firestore, `users/${currentUserId}/households`));
      membershipsSnapshot.docs.forEach((membershipDoc) => {
        addCandidateHouseholdId(membershipDoc.id);
      });
    } catch {
      // Ignore membership lookup failures and continue with known candidates.
    }
  }

  return Array.from(candidateHouseholdIds);
};

const mapChoreCatalogItem = (
  choreId: string,
  householdId: string,
  source: Record<string, unknown>,
): ChoreCatalogItem => {
  return {
    id: choreId,
    householdId,
    familyId: householdId,
    name: typeof source.name === 'string' ? source.name : 'Untitled Chore',
    baselineMinutes:
      typeof source.baselineMinutes === 'number' && Number.isFinite(source.baselineMinutes)
        ? source.baselineMinutes
        : 0,
    createdAt: toIsoString(source.createdAt),
    updatedAt: toIsoString(source.updatedAt),
  };
};

const resolveProfileLocationById = async (
  profileId: string,
  householdId?: string,
): Promise<{ householdId: string; profileId: string } | null> => {
  const safeProfileId = assertNonEmptyString(profileId, 'profileId');
  const firestore = getFirestore();
  const candidateHouseholdIds = await getCandidateHouseholdIds(householdId);

  for (const candidateHouseholdId of candidateHouseholdIds) {
    const profileSnapshot = await getDoc(
      doc(firestore, `households/${candidateHouseholdId}/profiles/${safeProfileId}`),
    );
    if (profileSnapshot.exists()) {
      return { householdId: candidateHouseholdId, profileId: safeProfileId };
    }
  }

  return null;
};

const resolveTaskLocationById = async (
  taskId: string,
  householdId?: string,
  profileId?: string,
): Promise<{ householdId: string; taskId: string; profileId?: string } | null> => {
  const safeTaskId = assertNonEmptyString(taskId, 'taskId');
  const firestore = getFirestore();
  const candidateHouseholdIds = await getCandidateHouseholdIds(householdId);

  // 1. If profileId is provided, check that specific location first (Optimization)
  if (profileId && typeof profileId === 'string') {
    for (const candidateHouseholdId of candidateHouseholdIds) {
      const taskSnapshot = await getDoc(
        doc(firestore, `households/${candidateHouseholdId}/profiles/${profileId}/tasks/${safeTaskId}`),
      );
      if (taskSnapshot.exists()) {
        return { householdId: candidateHouseholdId, taskId: safeTaskId, profileId };
      }
    }
  }

  // 2. Check root tasks collection (Legacy / Open Tasks)
  for (const candidateHouseholdId of candidateHouseholdIds) {
    const taskSnapshot = await getDoc(doc(firestore, `households/${candidateHouseholdId}/tasks/${safeTaskId}`));
    if (taskSnapshot.exists()) {
      return { householdId: candidateHouseholdId, taskId: safeTaskId };
    }
  }

  // 3. Fallback: Search in all profiles if not found yet (Expensive but necessary if profileId missing)
  // For now, avoiding full iteration unless strictly necessary.
  // Could rely on collectionGroup if indexed, but 'tasks' is generic.
  // Given the UI context, we usually know the profileId. 
  // If we really miss it, we might fail to find the task.
  // Let's iterate profiles for the FIRST candidate household (likely the active one)
  if (candidateHouseholdIds.length > 0) {
    const mainHouseholdId = candidateHouseholdIds[0];
    const profilesSnapshot = await getDocs(getProfilesCollectionRef(mainHouseholdId));
    for (const profileDoc of profilesSnapshot.docs) {
      if (profileDoc.id === profileId) continue; // Already checked
      const taskSnapshot = await getDoc(
        doc(firestore, `households/${mainHouseholdId}/profiles/${profileDoc.id}/tasks/${safeTaskId}`)
      );
      if (taskSnapshot.exists()) {
        return { householdId: mainHouseholdId, taskId: safeTaskId, profileId: profileDoc.id };
      }
    }
  }

  return null;
};

export const householdService = {
  async getUserHouseholdMembership(
    userId: string,
    householdId: string,
  ): Promise<HouseholdMembership | null> {
    try {
      const firestore = getFirestore();
      const safeUserId = assertNonEmptyString(userId, 'userId');
      const safeHouseholdId = assertNonEmptyString(householdId, 'householdId');
      const membershipSnapshot = await getDoc(
        doc(firestore, `users/${safeUserId}/households/${safeHouseholdId}`),
      );

      if (membershipSnapshot.exists()) {
        const payload = membershipSnapshot.data() as Record<string, unknown>;
        const profileId = typeof payload.profileId === 'string' ? payload.profileId : null;
        return {
          householdId: safeHouseholdId,
          role: parseRole(payload.role),
          profileId,
        };
      }

      const householdSnapshot = await getDoc(doc(firestore, `households/${safeHouseholdId}`));
      if (!householdSnapshot.exists()) {
        return null;
      }

      const householdPayload = householdSnapshot.data() as Record<string, unknown>;
      const ownerUserId = typeof householdPayload.ownerUserId === 'string' ? householdPayload.ownerUserId : '';
      if (ownerUserId !== safeUserId) {
        return null;
      }

      const adminProfileSnapshot = await getDocs(
        query(getProfilesCollectionRef(safeHouseholdId), where('role', '==', 'ADMIN'), limit(1)),
      );

      return {
        householdId: safeHouseholdId,
        role: 'ADMIN',
        profileId: adminProfileSnapshot.empty ? null : adminProfileSnapshot.docs[0].id,
      };
    } catch (error) {
      throw normalizeError('Failed to load user household membership', error);
    }
  },

  async getUserRoleInHousehold(userId: string, householdId: string): Promise<Role | null> {
    const membership = await householdService.getUserHouseholdMembership(userId, householdId);
    return membership?.role ?? null;
  },

  async getCurrentHousehold(userId?: string): Promise<Household | null> {
    try {
      const firestore = getFirestore();
      const stored = readStoredActiveProfile();
      const storedHouseholdId = stored?.householdId ?? stored?.familyId;

      if (storedHouseholdId) {
        const householdSnapshot = await getDoc(doc(firestore, `households/${storedHouseholdId}`));
        if (householdSnapshot.exists()) {
          const householdData = householdSnapshot.data();
          return {
            id: householdSnapshot.id,
            name:
              typeof householdData.name === 'string' && householdData.name.trim().length > 0
                ? householdData.name
                : 'Untitled Household',
          };
        }
      }

      if (!userId) {
        return null;
      }

      const membershipsSnapshot = await getDocs(
        query(collection(firestore, `users/${userId}/households`), limit(1)),
      );

      if (membershipsSnapshot.empty) {
        return null;
      }

      const firstMembership = membershipsSnapshot.docs[0];
      const householdId = firstMembership.id;
      const householdSnapshot = await getDoc(doc(firestore, `households/${householdId}`));

      if (!householdSnapshot.exists()) {
        return null;
      }

      const householdData = householdSnapshot.data();
      return {
        id: householdSnapshot.id,
        name:
          typeof householdData.name === 'string' && householdData.name.trim().length > 0
            ? householdData.name
            : 'Untitled Household',
      };
    } catch (error) {
      throw normalizeError('Failed to load household context', error);
    }
  },



  async createHouseholdForUser(
    userId: string,
    householdName: string,
    userName: string,
  ): Promise<{ household: Household; profile: Profile }> {
    try {
      const firestore = getFirestore();
      const safeUserId = assertNonEmptyString(userId, 'userId');
      const safeHouseholdName = assertNonEmptyString(householdName, 'householdName');
      const safeUserName = assertNonEmptyString(userName, 'userName');

      const householdRef = doc(collection(firestore, 'households'));
      const profilesCollection = collection(firestore, `households/${householdRef.id}/profiles`);
      const adminProfileRef = doc(profilesCollection);

      const adminProfile: FirestoreProfile = {
        householdId: householdRef.id,
        name: safeUserName,
        role: 'ADMIN',
        pinHash: '',
        gradeLevel: 'Adult',
        subjects: [],
        rates: defaultRates(),
        currentHourlyRate: 0,
        balanceCents: 0,
        balance: 0,
      };

      await setDoc(householdRef, {
        name: safeHouseholdName,
        ownerUserId: safeUserId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await setDoc(adminProfileRef, {
        ...adminProfile,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await setDoc(doc(firestore, `users/${safeUserId}/households/${householdRef.id}`), {
        householdId: householdRef.id,
        role: 'ADMIN',
        profileId: adminProfileRef.id,
        updatedAt: serverTimestamp(),
      });

      return {
        household: {
          id: householdRef.id,
          name: safeHouseholdName,
        },
        profile: {
          id: adminProfileRef.id,
          familyId: householdRef.id,
          ...adminProfile,
        },
      };
    } catch (error) {
      throw normalizeError('Failed to create household', error);
    }
  },

  async getAdminProfile(householdId: string): Promise<Profile | null> {
    try {
      const safeHouseholdId = assertNonEmptyString(householdId, 'householdId');
      const adminSnapshot = await getDocs(
        query(getProfilesCollectionRef(safeHouseholdId), where('role', '==', 'ADMIN'), limit(1)),
      );

      if (adminSnapshot.empty) {
        return null;
      }

      const adminDoc = adminSnapshot.docs[0];
      return mapProfile(adminDoc.id, safeHouseholdId, adminDoc.data() as Record<string, unknown>);
    } catch (error) {
      throw normalizeError('Failed to load admin profile', error);
    }
  },

  async getChildren(householdId: string): Promise<Child[]> {
    try {
      const safeHouseholdId = assertNonEmptyString(householdId, 'householdId');

      const [childrenSnapshot, tasksSnapshot, legacyTransactionsSnapshot] = await Promise.all([
        getDocs(query(getProfilesCollectionRef(safeHouseholdId), where('role', '==', 'CHILD'))),
        getDocs(getTasksCollectionRef(safeHouseholdId)),
        getDocs(getTransactionsCollectionRef(safeHouseholdId)),
      ]);

      const allTasks = tasksSnapshot.docs.map((taskDoc) =>
        mapTask(taskDoc.id, safeHouseholdId, taskDoc.data() as Record<string, unknown>),
      );

      const legacyTransactions = legacyTransactionsSnapshot.docs.map((transactionDoc) =>
        mapTransaction(
          transactionDoc.id,
          safeHouseholdId,
          transactionDoc.data() as Record<string, unknown>,
        ),
      );

      const profileTransactionsByProfileId = new Map<string, Transaction[]>();
      const profileTasksByProfileId = new Map<string, Task[]>();

      await Promise.all(
        childrenSnapshot.docs.map(async (childDoc) => {
          const profileTransactionsSnapshot = await getDocs(
            getProfileTransactionsCollectionRef(safeHouseholdId, childDoc.id),
          );
          const profileTransactions = profileTransactionsSnapshot.docs.map((transactionDoc) =>
            mapTransaction(
              transactionDoc.id,
              safeHouseholdId,
              transactionDoc.data() as Record<string, unknown>,
            ),
          );
          profileTransactionsByProfileId.set(childDoc.id, profileTransactions);

          const profileTasksSnapshot = await getDocs(
            collection(getFirestore(), `households/${safeHouseholdId}/profiles/${childDoc.id}/tasks`),
          );
          const profileTasks = profileTasksSnapshot.docs.map((taskDoc) =>
            mapTask(taskDoc.id, safeHouseholdId, taskDoc.data() as Record<string, unknown>),
          );
          profileTasksByProfileId.set(childDoc.id, profileTasks);
        }),
      );

      return childrenSnapshot.docs.map((childDoc) => {
        const profile = mapProfile(childDoc.id, safeHouseholdId, childDoc.data() as Record<string, unknown>);
        const rootTasksForChild = allTasks.filter(
          (task) => task.assigneeId === childDoc.id && task.status !== 'PAID' && task.status !== 'DELETED',
        );
        const subCollectionTasks = profileTasksByProfileId.get(childDoc.id) ?? [];

        // Merge tasks, preferring sub-collection if ID duplicates exist (shouldn't happen with UUIDs but safe)
        const combinedTasks = [...rootTasksForChild, ...subCollectionTasks];

        // Deduplicate by ID just in case
        const uniqueTasksMap = new Map();
        combinedTasks.forEach(t => uniqueTasksMap.set(t.id, t));
        const uniqueTasks = Array.from(uniqueTasksMap.values()) as Task[];

        const childHistory = [...(profileTransactionsByProfileId.get(childDoc.id) ?? []), ...legacyTransactions]
          .filter((transaction) => transaction.profileId === childDoc.id)
          .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())
          .slice(0, 20);

        return {
          ...profile,
          pin: profile.pinHash ? '****' : '',
          history: childHistory,
          customTasks: uniqueTasks,
        };
      });
    } catch (error) {
      throw normalizeError('Failed to load children', error);
    }
  },

  async getOpenTasks(householdId: string): Promise<Task[]> {
    try {
      const safeHouseholdId = assertNonEmptyString(householdId, 'householdId');
      const taskSnapshot = await getDocs(
        query(
          getTasksCollectionRef(safeHouseholdId),
          where('status', '==', 'OPEN'),
          where('assigneeId', '==', null),
        ),
      );

      return taskSnapshot.docs.map((taskDoc) =>
        mapTask(taskDoc.id, safeHouseholdId, taskDoc.data() as Record<string, unknown>),
      );
    } catch (error) {
      throw normalizeError('Failed to load open tasks', error);
    }
  },

  async getDraftTasks(householdId: string): Promise<Task[]> {
    try {
      const safeHouseholdId = assertNonEmptyString(householdId, 'householdId');
      const taskSnapshot = await getDocs(
        query(getTasksCollectionRef(safeHouseholdId), where('status', '==', 'DRAFT')),
      );

      return taskSnapshot.docs.map((taskDoc) =>
        mapTask(taskDoc.id, safeHouseholdId, taskDoc.data() as Record<string, unknown>),
      );
    } catch (error) {
      throw normalizeError('Failed to load draft tasks', error);
    }
  },

  async getChoreCatalog(householdId: string): Promise<ChoreCatalogItem[]> {
    try {
      const safeHouseholdId = assertNonEmptyString(householdId, 'householdId');
      const catalogSnapshot = await getDocs(getChoreCatalogCollectionRef(safeHouseholdId));

      return catalogSnapshot.docs
        .map((catalogDoc) =>
          mapChoreCatalogItem(
            catalogDoc.id,
            safeHouseholdId,
            catalogDoc.data() as Record<string, unknown>,
          ),
        )
        .sort((left, right) => left.name.localeCompare(right.name));
    } catch (error) {
      throw normalizeError('Failed to load chore catalog', error);
    }
  },

  /**
   * Updates a chore catalog item's name and/or baseline minutes.
   *
   * @param householdId - The household that owns the catalog.
   * @param itemId - The Firestore document ID of the catalog item.
   * @param updates - Partial updates: name and/or baselineMinutes.
   */
  async updateChoreCatalogItem(
    householdId: string,
    itemId: string,
    updates: { name?: string; baselineMinutes?: number },
  ): Promise<void> {
    try {
      const safeHouseholdId = assertNonEmptyString(householdId, 'householdId');
      const safeItemId = assertNonEmptyString(itemId, 'itemId');
      const firestore = getFirestore();
      const itemRef = doc(firestore, `households/${safeHouseholdId}/chore_catalog/${safeItemId}`);

      const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };

      if (typeof updates.name === 'string' && updates.name.trim().length > 0) {
        payload.name = updates.name.trim();
      }
      if (typeof updates.baselineMinutes === 'number' && Number.isFinite(updates.baselineMinutes)) {
        payload.baselineMinutes = Math.max(0, Math.round(updates.baselineMinutes));
      }

      await updateDoc(itemRef, payload);
    } catch (error) {
      throw normalizeError('Failed to update catalog item', error);
    }
  },

  /**
   * Permanently removes a chore catalog item from Firestore.
   *
   * @param householdId - The household that owns the catalog.
   * @param itemId - The Firestore document ID of the catalog item to delete.
   */
  async deleteChoreCatalogItem(householdId: string, itemId: string): Promise<void> {
    try {
      const safeHouseholdId = assertNonEmptyString(householdId, 'householdId');
      const safeItemId = assertNonEmptyString(itemId, 'itemId');
      const firestore = getFirestore();
      const itemRef = doc(firestore, `households/${safeHouseholdId}/chore_catalog/${safeItemId}`);
      await deleteDoc(itemRef);
    } catch (error) {
      throw normalizeError('Failed to delete catalog item', error);
    }
  },

  async getGradeConfigs(householdId: string): Promise<GradeConfig[]> {
    try {
      const safeHouseholdId = assertNonEmptyString(householdId, 'householdId');
      const configRef = doc(getFirestore(), `households/${safeHouseholdId}/settings/grade_configs`);
      const configSnapshot = await getDoc(configRef);

      if (configSnapshot.exists()) {
        const payload = configSnapshot.data() as Record<string, unknown>;
        return mapGradeConfigs(payload, defaultRates());
      }

      const adminSnapshot = await getDocs(
        query(getProfilesCollectionRef(safeHouseholdId), where('role', '==', 'ADMIN'), limit(1)),
      );
      if (!adminSnapshot.empty) {
        const adminRates = parseRates((adminSnapshot.docs[0].data() as Record<string, unknown>).rates);
        return Object.values(Grade).map((grade) => ({
          grade,
          valueCents: dollarsToCents(adminRates[grade] ?? 0),
        }));
      }

      console.warn(`Grade Configs missing in Firestore at path: households/${safeHouseholdId}/settings/grade_configs`);
      return mapGradeConfigs({}, defaultRates());
    } catch (error) {
      throw normalizeError('Failed to load grade configs', error);
    }
  },

  async createChild(householdId: string, child: Partial<Child>): Promise<Child> {
    try {
      const safeHouseholdId = assertNonEmptyString(householdId, 'householdId');
      const childName = assertNonEmptyString(child.name, 'child.name');
      const gradeLevel = typeof child.gradeLevel === 'string' ? child.gradeLevel : 'Unknown';
      const subjects = parseSubjects(child.subjects);
      const rates = parseRates(child.rates);

      const childRef = doc(getProfilesCollectionRef(safeHouseholdId));
      const childProfile = createProfileWritePayload({
        householdId: safeHouseholdId,
        name: childName,
        pinHash: '',
        gradeLevel,
        subjects,
        rates,
        currentHourlyRate: typeof child.currentHourlyRate === 'number' ? child.currentHourlyRate : 0,
      });

      await setDoc(childRef, {
        ...childProfile,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return {
        ...childProfile,
        id: childRef.id,
        familyId: safeHouseholdId,
        pin: child.pin,
        history: [],
        customTasks: [],
      };
    } catch (error) {
      throw normalizeError('Failed to create child profile', error);
    }
  },

  async createProfile(
    householdId: string,
    payload: { name: string; pin?: string; avatarColor?: string },
  ): Promise<Profile> {
    try {
      const safeHouseholdId = assertNonEmptyString(householdId, 'householdId');
      const profileName = assertNonEmptyString(payload.name, 'profile.name');
      const pin = typeof payload.pin === 'string' ? payload.pin.trim() : '';
      if (pin && !/^\d{4}$/.test(pin)) {
        throw new Error('profile.pin must be exactly 4 digits when provided.');
      }
      const pinHash = pin ? await hashPin(pin) : '';
      const profileRef = doc(getProfilesCollectionRef(safeHouseholdId));
      const profile = createProfileWritePayload({
        householdId: safeHouseholdId,
        name: profileName,
        pinHash,
        avatarColor: typeof payload.avatarColor === 'string' ? payload.avatarColor : '#3b82f6',
      });

      await setDoc(profileRef, {
        ...profile,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return {
        ...profile,
        id: profileRef.id,
        familyId: safeHouseholdId,
      };
    } catch (error) {
      throw normalizeError('Failed to create profile', error);
    }
  },

  async childLogin(input: { username: string; pin: string; householdId?: string }): Promise<ChildLoginResponse> {
    try {
      const payload = buildChildLoginPayload(input);

      if (!functions) {
        throw new Error('Child sign-in requires Firebase Functions configuration.');
      }

      const callable = httpsCallable<ChildLoginRequest, ChildLoginResponse>(functions, 'childLogin');
      const result = await callWithExponentialBackoff(() => callable(payload));
      const response = result.data;

      if (!response || typeof response !== 'object') {
        throw new Error('Child sign-in failed.');
      }

      if (
        typeof response.token !== 'string' ||
        typeof response.householdId !== 'string' ||
        typeof response.profileId !== 'string' ||
        response.role !== 'CHILD'
      ) {
        throw new Error('Child sign-in failed.');
      }

      return response;
    } catch (error) {
      throw normalizeError('Failed child sign-in', error);
    }
  },

  async adminResetChildPin(input: {
    householdId: string;
    profileId: string;
    newPin: string;
  }): Promise<void> {
    try {
      const payload = buildAdminResetPinPayload(input);

      if (functions) {
        const callable = httpsCallable<AdminResetChildPinRequest, { success: true }>(
          functions,
          'adminResetChildPin',
        );
        await callWithExponentialBackoff(() => callable(payload));
        return;
      }

      await householdService.setProfilePinInHousehold(payload.householdId, payload.profileId, payload.newPin);
    } catch (error) {
      throw normalizeError('Failed to reset child PIN', error);
    }
  },

  async updateChildUsername(input: {
    householdId: string;
    profileId: string;
    username: string;
  }): Promise<void> {
    try {
      const firestore = getFirestore();
      const householdId = assertNonEmptyString(input.householdId, 'householdId');
      const profileId = assertNonEmptyString(input.profileId, 'profileId');
      const username = normalizeChildUsername(assertNonEmptyString(input.username, 'username'));

      if (!isValidChildUsername(username)) {
        throw new Error('username must be 3-24 characters and use letters, numbers, dot, dash, or underscore.');
      }

      const existingUsernameQuery = await getDocs(
        query(
          getProfilesCollectionRef(householdId),
          where('loginUsernameCanonical', '==', username),
          limit(2),
        ),
      );

      const hasConflict = existingUsernameQuery.docs.some((profileDoc) => profileDoc.id !== profileId);
      if (hasConflict) {
        throw new Error('Username is already used by another child profile.');
      }

      const profileRef = doc(firestore, `households/${householdId}/profiles/${profileId}`);
      const profileSnapshot = await getDoc(profileRef);
      if (!profileSnapshot.exists()) {
        throw new Error('Profile not found in this household.');
      }

      await updateDoc(profileRef, {
        loginUsername: username,
        loginUsernameCanonical: username,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      throw normalizeError('Failed to update child username', error);
    }
  },

  async createTask(
    householdId: string,
    task: Task,
    options?: { saveToCatalog?: boolean; catalogItemId?: string | null; isRecurring?: boolean },
  ): Promise<Task> {
    try {
      const safeHouseholdId = assertNonEmptyString(householdId, 'householdId');
      const safeTaskName = assertNonEmptyString(task.name, 'task.name');
      const status = parseTaskStatus(task.status);

      let taskCollection;
      if (typeof task.assigneeId === 'string' && task.assigneeId.length > 0) {
        taskCollection = collection(getFirestore(), `households/${safeHouseholdId}/profiles/${task.assigneeId}/tasks`);
      } else {
        taskCollection = getTasksCollectionRef(safeHouseholdId);
      }

      const taskRef =
        typeof task.id === 'string' && task.id.trim().length > 0
          ? doc(taskCollection, task.id)
          : doc(taskCollection);

      const firestoreTask: FirestoreTask = {
        householdId: safeHouseholdId,
        name: safeTaskName,
        baselineMinutes: Number.isFinite(task.baselineMinutes) ? task.baselineMinutes : 0,
        status,
        rejectionComment: typeof task.rejectionComment === 'string' ? task.rejectionComment : null,
        assigneeId: typeof task.assigneeId === 'string' ? task.assigneeId : null,
        catalogItemId:
          typeof options?.catalogItemId === 'string'
            ? options.catalogItemId
            : typeof task.catalogItemId === 'string'
              ? task.catalogItemId
              : null,
        valueCents: typeof task.valueCents === 'number' ? task.valueCents : null,
        isRecurring: task.isRecurring || false,
        multiplier: typeof task.multiplier === 'number' ? task.multiplier : 1.0,
      };

      await setDoc(taskRef, {
        ...firestoreTask,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      if (options?.saveToCatalog) {
        const normalizedCatalogId = safeTaskName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const catalogDocId =
          normalizedCatalogId.length > 0
            ? normalizedCatalogId
            : `${safeTaskName.toLowerCase()}-${Math.floor(Date.now() / 1000)}`;
        const catalogRef = doc(getChoreCatalogCollectionRef(safeHouseholdId), catalogDocId);

        await setDoc(
          catalogRef,
          {
            householdId: safeHouseholdId,
            name: safeTaskName,
            baselineMinutes: firestoreTask.baselineMinutes,
            isRecurring: options?.isRecurring || false,
            updatedAt: serverTimestamp(),
            createdAt: serverTimestamp(),
          },
          { merge: true },
        );
      }

      return {
        id: taskRef.id,
        familyId: safeHouseholdId,
        ...firestoreTask,
      };
    } catch (error) {
      throw normalizeError('Failed to create task', error);
    }
  },

  /**
   * Assigns an existing open (root-level) task to a child profile.
   *
   * This performs an atomic batch write that:
   * 1. Creates the task in the child's profile sub-collection with status ASSIGNED.
   * 2. Deletes the original document from the root household tasks collection.
   *
   * This prevents the "ghost open task" bug where assigning via createTask() left
   * the original document in place because only a copy was written.
   */
  async assignExistingTask(
    householdId: string,
    profileId: string,
    task: Task,
  ): Promise<void> {
    try {
      const safeHouseholdId = assertNonEmptyString(householdId, 'householdId');
      const safeProfileId = assertNonEmptyString(profileId, 'profileId');
      const safeTaskId = assertNonEmptyString(task.id, 'task.id');

      const firestore = getFirestore();
      const batch = writeBatch(firestore);

      // Destination: profile sub-collection
      const destinationRef = doc(
        firestore,
        `households/${safeHouseholdId}/profiles/${safeProfileId}/tasks/${safeTaskId}`,
      );
      batch.set(destinationRef, {
        householdId: safeHouseholdId,
        name: task.name,
        baselineMinutes: Number.isFinite(task.baselineMinutes) ? task.baselineMinutes : 0,
        status: 'ASSIGNED',
        assigneeId: safeProfileId,
        catalogItemId: typeof task.catalogItemId === 'string' ? task.catalogItemId : null,
        rejectionComment: typeof task.rejectionComment === 'string' ? task.rejectionComment : null,
        valueCents: typeof task.valueCents === 'number' ? task.valueCents : null,
        multiplier: typeof task.multiplier === 'number' ? task.multiplier : 1.0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Source: root household tasks collection — delete the original
      const sourceRef = doc(
        firestore,
        `households/${safeHouseholdId}/tasks/${safeTaskId}`,
      );
      batch.delete(sourceRef);

      await batch.commit();
    } catch (error) {
      throw normalizeError('Failed to assign existing task', error);
    }
  },

  async updateTaskById(taskId: string, updates: Partial<Task>, profileId?: string): Promise<void> {
    try {
      const safeTaskId = assertNonEmptyString(taskId, 'taskId');
      const resolvedTask = await resolveTaskLocationById(safeTaskId, undefined, profileId);

      if (!resolvedTask) {
        throw new Error('Task not found.');
      }

      const firestore = getFirestore();
      const taskRef = resolvedTask.profileId
        ? doc(firestore, `households/${resolvedTask.householdId}/profiles/${resolvedTask.profileId}/tasks/${resolvedTask.taskId}`)
        : doc(firestore, `households/${resolvedTask.householdId}/tasks/${resolvedTask.taskId}`);

      const updatePayload: Record<string, unknown> = {
        updatedAt: serverTimestamp(),
      };

      if (typeof updates.name === 'string' && updates.name.trim().length > 0) {
        updatePayload.name = updates.name;
      }
      if (typeof updates.baselineMinutes === 'number' && Number.isFinite(updates.baselineMinutes)) {
        updatePayload.baselineMinutes = updates.baselineMinutes;
      }
      if (typeof updates.status === 'string') {
        updatePayload.status = parseTaskStatus(updates.status);
      }
      if (typeof updates.rejectionComment === 'string') {
        updatePayload.rejectionComment = updates.rejectionComment;
      }
      if (updates.assigneeId === null) {
        updatePayload.assigneeId = null;
      }
      if (typeof updates.assigneeId === 'string') {
        updatePayload.assigneeId = updates.assigneeId;
      }
      if (updates.catalogItemId === null) {
        updatePayload.catalogItemId = null;
      }
      if (typeof updates.catalogItemId === 'string') {
        updatePayload.catalogItemId = updates.catalogItemId;
      }

      await updateDoc(taskRef, updatePayload);
    } catch (error) {
      throw normalizeError('Failed to update task', error);
    }
  },

  /**
   * Permanently removes a task document from Firestore.
   *
   * Resolves the task's storage location (root collection or child sub-collection)
   * before deleting, ensuring the correct document is removed regardless of where
   * the task lives in the hierarchy.
   *
   * @param taskId - The Firestore document ID of the task to delete.
   * @param profileId - Optional child profile ID to speed up location resolution.
   */
  async deleteTaskById(taskId: string, profileId?: string): Promise<void> {
    try {
      const safeTaskId = assertNonEmptyString(taskId, 'taskId');
      const resolvedTask = await resolveTaskLocationById(safeTaskId, undefined, profileId);

      if (!resolvedTask) {
        throw new Error('Task not found.');
      }

      const firestore = getFirestore();
      const taskRef = resolvedTask.profileId
        ? doc(
          firestore,
          `households/${resolvedTask.householdId}/profiles/${resolvedTask.profileId}/tasks/${resolvedTask.taskId}`,
        )
        : doc(firestore, `households/${resolvedTask.householdId}/tasks/${resolvedTask.taskId}`);

      await deleteDoc(taskRef);
    } catch (error) {
      throw normalizeError('Failed to delete task', error);
    }
  },

  async updateChildById(childId: string, updates: Partial<Child>): Promise<void> {
    try {
      const safeChildId = assertNonEmptyString(childId, 'childId');
      const resolvedProfile = await resolveProfileLocationById(safeChildId);

      if (!resolvedProfile) {
        throw new Error('Child profile not found.');
      }

      const firestore = getFirestore();
      const profileRef = doc(
        firestore,
        `households/${resolvedProfile.householdId}/profiles/${resolvedProfile.profileId}`,
      );

      const updatePayload: Record<string, unknown> = {
        updatedAt: serverTimestamp(),
      };

      if (typeof updates.name === 'string' && updates.name.trim().length > 0) {
        updatePayload.name = updates.name;
      }
      if (typeof updates.gradeLevel === 'string' && updates.gradeLevel.trim().length > 0) {
        updatePayload.gradeLevel = updates.gradeLevel;
      }
      if (Array.isArray(updates.subjects)) {
        updatePayload.subjects = parseSubjects(updates.subjects);
      }
      if (updates.rates && typeof updates.rates === 'object') {
        updatePayload.rates = parseRates(updates.rates);
      }
      if (typeof updates.currentHourlyRate === 'number') {
        updatePayload.currentHourlyRate = updates.currentHourlyRate;
      }
      if (typeof updates.loginUsername === 'string') {
        const normalizedUsername = normalizeChildUsername(updates.loginUsername);
        if (!isValidChildUsername(normalizedUsername)) {
          throw new Error(
            'username must be 3-24 characters and use letters, numbers, dot, dash, or underscore.',
          );
        }
        const existingUsernameSnapshot = await getDocs(
          query(
            getProfilesCollectionRef(resolvedProfile.householdId),
            where('loginUsernameCanonical', '==', normalizedUsername),
            limit(2),
          ),
        );
        const hasConflict = existingUsernameSnapshot.docs.some((profileDoc) => {
          return profileDoc.id !== resolvedProfile.profileId;
        });
        if (hasConflict) {
          throw new Error('Username is already used by another child profile.');
        }
        updatePayload.loginUsername = normalizedUsername;
        updatePayload.loginUsernameCanonical = normalizedUsername;
      }

      await updateDoc(profileRef, updatePayload);
    } catch (error) {
      throw normalizeError('Failed to update child profile', error);
    }
  },

  async addEarning(
    profileId: string,
    taskId: string,
    amountCents: number,
    memo: string,
    householdId: string,
  ): Promise<void> {
    try {
      const safeProfileId = assertNonEmptyString(profileId, 'profileId');
      const safeTaskId = assertNonEmptyString(taskId, 'taskId');
      const safeMemo = assertNonEmptyString(memo, 'memo');
      const safeHouseholdId = assertNonEmptyString(householdId, 'householdId');

      const firestore = getFirestore();

      const normalizedAmountCents = Math.round(amountCents);
      if (!Number.isFinite(normalizedAmountCents) || normalizedAmountCents <= 0) {
        throw new Error('amountCents must be a positive integer.');
      }

      await ledgerService.recordTaskPayment({
        firestore,
        householdId: safeHouseholdId,
        profileId: safeProfileId,
        taskId: safeTaskId,
        amountCents: normalizedAmountCents,
        memo: safeMemo,
      });
    } catch (error) {
      throw normalizeError('Failed to apply earning', error);
    }
  },

  async addAdvance(
    profileId: string,
    amountCents: number,
    memo: string,
    category: string,
    householdId: string,
  ): Promise<void> {
    try {
      const safeProfileId = assertNonEmptyString(profileId, 'profileId');
      const safeMemo = assertNonEmptyString(memo, 'memo');
      const safeHouseholdId = assertNonEmptyString(householdId, 'householdId');

      const safeCategory = parseAdvanceCategory(category) ?? 'Other';

      const firestore = getFirestore();

      const normalizedAmountCents = Math.round(amountCents);
      // We enforce a positive input amount for the advance itself, 
      // which the ledger service will correctly invert to a negative balance impact.
      if (!Number.isFinite(normalizedAmountCents) || normalizedAmountCents <= 0) {
        throw new Error('amountCents must be a positive integer.');
      }

      await ledgerService.recordAdvance({
        firestore,
        householdId: safeHouseholdId,
        profileId: safeProfileId,
        amountCents: normalizedAmountCents,
        memo: safeMemo,
        category: safeCategory,
      });

      // Create a PAID task document so the advance appears as a line item
      // on the child's dashboard card without cluttering the Open list.
      const advanceTaskCollection = collection(
        firestore,
        `households/${safeHouseholdId}/profiles/${safeProfileId}/tasks`,
      );
      const advanceTaskRef = doc(advanceTaskCollection);
      await setDoc(advanceTaskRef, {
        householdId: safeHouseholdId,
        name: `Advance: ${safeMemo}`,
        status: 'PAID',
        assigneeId: safeProfileId,
        baselineMinutes: 0,
        catalogItemId: null,
        valueCents: normalizedAmountCents * -1,
        category: safeCategory,
        type: 'ADVANCE',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        paidAt: serverTimestamp(),
      });
    } catch (error) {
      throw normalizeError('Failed to apply advance', error);
    }
  },

  async addManualAdjustment(
    profileId: string,
    amountCents: number,
    memo: string,
    householdId: string,
  ): Promise<void> {
    try {
      const safeProfileId = assertNonEmptyString(profileId, 'profileId');
      const safeMemo = assertNonEmptyString(memo, 'memo');
      const safeHouseholdId = assertNonEmptyString(householdId, 'householdId');
      const normalizedAmountCents = Math.round(amountCents);
      if (!Number.isFinite(normalizedAmountCents) || normalizedAmountCents === 0) {
        throw new Error('amountCents must be a non-zero integer.');
      }

      await ledgerService.recordManualAdjustment({
        firestore: getFirestore(),
        householdId: safeHouseholdId,
        profileId: safeProfileId,
        amountCents: normalizedAmountCents,
        memo: safeMemo,
      });
    } catch (error) {
      throw normalizeError('Failed to apply manual adjustment', error);
    }
  },

  async setProfilePinHash(profileId: string, pinHash: string): Promise<void> {
    try {
      const safeProfileId = assertNonEmptyString(profileId, 'profileId');
      const safePinHash = assertNonEmptyString(pinHash, 'pinHash');
      const resolvedProfile = await resolveProfileLocationById(safeProfileId);

      if (!resolvedProfile) {
        throw new Error('Profile not found.');
      }

      const firestore = getFirestore();
      const profileRef = doc(
        firestore,
        `households/${resolvedProfile.householdId}/profiles/${resolvedProfile.profileId}`,
      );

      await updateDoc(profileRef, {
        pinHash: safePinHash,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      throw normalizeError('Failed to save PIN hash', error);
    }
  },

  async verifyProfilePinHash(profileId: string, candidatePinHash: string): Promise<boolean> {
    try {
      const safeProfileId = assertNonEmptyString(profileId, 'profileId');
      const safeCandidatePinHash = assertNonEmptyString(candidatePinHash, 'candidatePinHash');
      const resolvedProfile = await resolveProfileLocationById(safeProfileId);

      if (!resolvedProfile) {
        return false;
      }

      const firestore = getFirestore();
      const profileSnapshot = await getDoc(
        doc(firestore, `households/${resolvedProfile.householdId}/profiles/${resolvedProfile.profileId}`),
      );

      if (!profileSnapshot.exists()) {
        return false;
      }

      const storedPinHash = profileSnapshot.data().pinHash;
      return typeof storedPinHash === 'string' && storedPinHash === safeCandidatePinHash;
    } catch (error) {
      throw normalizeError('Failed to verify profile PIN', error);
    }
  },

  async setProfilePin(profileId: string, pin: string): Promise<void> {
    const pinHash = await hashPin(pin);
    await householdService.setProfilePinHash(profileId, pinHash);
  },

  async verifyProfilePin(profileId: string, pin: string): Promise<boolean> {
    const candidatePinHash = await hashPin(pin);
    return householdService.verifyProfilePinHash(profileId, candidatePinHash);
  },

  async setProfilePinInHousehold(householdId: string, profileId: string, pin: string): Promise<void> {
    try {
      const firestore = getFirestore();
      const safeHouseholdId = assertNonEmptyString(householdId, 'householdId');
      const safeProfileId = assertNonEmptyString(profileId, 'profileId');
      const safePin = assertNonEmptyString(pin, 'pin');

      if (!/^\d{4}$/.test(safePin)) {
        throw new Error('pin must be exactly 4 digits.');
      }

      const pinHash = await hashPin(safePin);
      const profileRef = doc(firestore, `households/${safeHouseholdId}/profiles/${safeProfileId}`);
      const profileSnapshot = await getDoc(profileRef);

      if (!profileSnapshot.exists()) {
        throw new Error('Profile not found in this household.');
      }

      await updateDoc(profileRef, {
        pinHash,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      throw normalizeError('Failed to save profile PIN', error);
    }
  },

  async verifyProfilePinInHousehold(
    householdId: string,
    profileId: string,
    pin: string,
  ): Promise<boolean> {
    try {
      const firestore = getFirestore();
      const safeHouseholdId = assertNonEmptyString(householdId, 'householdId');
      const safeProfileId = assertNonEmptyString(profileId, 'profileId');
      const safePin = assertNonEmptyString(pin, 'pin');
      const candidatePinHash = await hashPin(safePin);

      const profileRef = doc(firestore, `households/${safeHouseholdId}/profiles/${safeProfileId}`);
      const profileSnapshot = await getDoc(profileRef);
      if (!profileSnapshot.exists()) {
        return false;
      }

      const storedPinHash = (profileSnapshot.data() as Record<string, unknown>).pinHash;
      return typeof storedPinHash === 'string' && storedPinHash === candidatePinHash;
    } catch (error) {
      throw normalizeError('Failed to verify profile PIN', error);
    }
  },

  async generateProfileSetupLink(householdId: string, profileId: string): Promise<string> {
    try {
      const firestore = getFirestore();
      const safeHouseholdId = assertNonEmptyString(householdId, 'householdId');
      const safeProfileId = assertNonEmptyString(profileId, 'profileId');
      const profileRef = doc(firestore, `households/${safeHouseholdId}/profiles/${safeProfileId}`);
      const profileSnapshot = await getDoc(profileRef);

      if (!profileSnapshot.exists()) {
        throw new Error('Profile not found in this household.');
      }

      const rawToken =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID().replace(/-/g, '')
          : `${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
      const tokenHash = await hashToken(rawToken);
      const expiresAt = Timestamp.fromDate(
        new Date(Date.now() + DEFAULT_PROFILE_SETUP_EXPIRY_HOURS * 60 * 60 * 1000),
      );

      await updateDoc(profileRef, {
        setupTokenHash: tokenHash,
        setupTokenExpiresAt: expiresAt,
        setupTokenUsedAt: null,
        setupStatus: 'INVITE_SENT',
        inviteLastSentAt: Timestamp.now(),
        updatedAt: serverTimestamp(),
      });

      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const setupLinkQuery = new URLSearchParams({
        token: rawToken,
        householdId: safeHouseholdId,
      });
      return `${baseUrl}/setup-profile/${safeProfileId}?${setupLinkQuery.toString()}`;
    } catch (error) {
      throw normalizeError('Failed to generate profile setup link', error);
    }
  },

  async validateProfileSetupLink(
    profileId: string,
    token: string,
    householdId?: string,
  ): Promise<{ householdId: string; profile: Profile }> {
    try {
      const safeProfileId = assertNonEmptyString(profileId, 'profileId');
      const safeToken = assertNonEmptyString(token, 'token');
      const safeHouseholdId =
        typeof householdId === 'string' && householdId.trim().length > 0 ? householdId.trim() : undefined;

      if (functions) {
        const callable = httpsCallable<ValidateProfileSetupLinkRequest, ValidateProfileSetupLinkResponse>(
          functions,
          'validateProfileSetupLink',
        );
        try {
          const result = await callWithExponentialBackoff(() => {
            return callable({
              profileId: safeProfileId,
              token: safeToken,
              householdId: safeHouseholdId,
            });
          });

          const payload = result.data;
          if (!payload || typeof payload !== 'object') {
            throw new Error('Profile setup link is invalid.');
          }
          if (typeof payload.householdId !== 'string' || payload.householdId.trim().length === 0) {
            throw new Error('Profile setup link is invalid.');
          }
          if (!payload.profile || typeof payload.profile !== 'object') {
            throw new Error('Profile setup link is invalid.');
          }
          const profilePayload = payload.profile;
          if (typeof profilePayload.id !== 'string' || typeof profilePayload.name !== 'string') {
            throw new Error('Profile setup link is invalid.');
          }

          return {
            householdId: payload.householdId,
            profile: mapSetupProfileFromCallable(payload.householdId, {
              id: profilePayload.id,
              name: profilePayload.name,
              avatarColor:
                typeof profilePayload.avatarColor === 'string' ? profilePayload.avatarColor : undefined,
              loginUsername:
                typeof profilePayload.loginUsername === 'string'
                  ? profilePayload.loginUsername
                  : undefined,
            }),
          };
        } catch (callableError) {
          const code = getCallableErrorCode(callableError);
          if (code !== 'not-found' && code !== 'unimplemented') {
            throw callableError;
          }
        }
      }

      const resolvedProfile = await resolveProfileLocationById(safeProfileId, safeHouseholdId);
      if (!resolvedProfile) {
        throw new Error('Profile setup link is invalid.');
      }

      const firestore = getFirestore();
      const profileRef = doc(
        firestore,
        `households/${resolvedProfile.householdId}/profiles/${resolvedProfile.profileId}`,
      );
      const profileSnapshot = await getDoc(profileRef);
      if (!profileSnapshot.exists()) {
        throw new Error('Profile setup link is invalid.');
      }

      const payload = profileSnapshot.data() as Record<string, unknown>;
      const storedTokenHash = payload.setupTokenHash;
      const expiresAt = payload.setupTokenExpiresAt;
      const usedAt = payload.setupTokenUsedAt;

      if (typeof storedTokenHash !== 'string' || storedTokenHash.length === 0) {
        throw new Error('Profile setup link is invalid.');
      }
      if (!(expiresAt instanceof Timestamp) || expiresAt.toMillis() < Date.now()) {
        throw new Error('Profile setup link has expired.');
      }
      if (usedAt instanceof Timestamp) {
        throw new Error('Profile setup link has already been used.');
      }

      const candidateTokenHash = await hashToken(safeToken);
      if (candidateTokenHash !== storedTokenHash) {
        throw new Error('Profile setup link is invalid.');
      }

      return {
        householdId: resolvedProfile.householdId,
        profile: mapProfile(resolvedProfile.profileId, resolvedProfile.householdId, payload),
      };
    } catch (error) {
      throw normalizeError('Failed to validate profile setup link', error);
    }
  },

  async completeProfileSetup(input: {
    householdId: string;
    profileId: string;
    token: string;
    pin: string;
    avatarColor: string;
    username: string;
  }): Promise<void> {
    try {
      const safeHouseholdId = assertNonEmptyString(input.householdId, 'householdId');
      const safeProfileId = assertNonEmptyString(input.profileId, 'profileId');
      const safeToken = assertNonEmptyString(input.token, 'token');
      const safePin = assertNonEmptyString(input.pin, 'pin');
      const safeAvatarColor = assertNonEmptyString(input.avatarColor, 'avatarColor');
      const safeUsername = normalizeChildUsername(assertNonEmptyString(input.username, 'username'));

      if (!/^\d{4}$/.test(safePin)) {
        throw new Error('PIN must be exactly 4 digits.');
      }
      if (!isValidChildUsername(safeUsername)) {
        throw new Error(
          'Username must be 3-24 characters and use letters, numbers, dot, dash, or underscore.',
        );
      }

      if (functions) {
        const callable = httpsCallable<CompleteProfileSetupRequest, { success: boolean }>(
          functions,
          'completeProfileSetup',
        );
        try {
          await callWithExponentialBackoff(() => {
            return callable({
              householdId: safeHouseholdId,
              profileId: safeProfileId,
              token: safeToken,
              pin: safePin,
              avatarColor: safeAvatarColor,
              username: safeUsername,
            });
          });
          return;
        } catch (callableError) {
          const code = getCallableErrorCode(callableError);
          if (code !== 'not-found' && code !== 'unimplemented') {
            throw callableError;
          }
        }
      }

      const firestore = getFirestore();
      const pinHash = await hashPin(safePin);
      const candidateTokenHash = await hashToken(safeToken);
      const profileRef = doc(firestore, `households/${safeHouseholdId}/profiles/${safeProfileId}`);

      await runTransaction(firestore, async (transaction) => {
        const profileSnapshot = await transaction.get(profileRef);
        if (!profileSnapshot.exists()) {
          throw new Error('Profile setup link is invalid.');
        }

        const payload = profileSnapshot.data() as Record<string, unknown>;
        const storedTokenHash = payload.setupTokenHash;
        const expiresAt = payload.setupTokenExpiresAt;
        const usedAt = payload.setupTokenUsedAt;

        if (typeof storedTokenHash !== 'string' || storedTokenHash.length === 0) {
          throw new Error('Profile setup link is invalid.');
        }
        if (!(expiresAt instanceof Timestamp) || expiresAt.toMillis() < Date.now()) {
          throw new Error('Profile setup link has expired.');
        }
        if (usedAt instanceof Timestamp) {
          throw new Error('Profile setup link has already been used.');
        }
        if (candidateTokenHash !== storedTokenHash) {
          throw new Error('Profile setup link is invalid.');
        }

        const existingUsernameSnapshot = await getDocs(
          query(
            getProfilesCollectionRef(safeHouseholdId),
            where('loginUsernameCanonical', '==', safeUsername),
            limit(1), // We only need to know if one exists
          ),
        );
        const hasConflict = existingUsernameSnapshot.docs.some((docSnapshot) => {
          return docSnapshot.id !== safeProfileId;
        });
        if (hasConflict) {
          throw new Error('Username is already taken in this household.');
        }

        transaction.update(profileRef, {
          pinHash,
          loginUsername: safeUsername,
          loginUsernameCanonical: safeUsername,
          avatarColor: safeAvatarColor,
          setupTokenHash: null,
          setupTokenUsedAt: Timestamp.now(),
          setupStatus: 'SETUP_COMPLETE',
          setupCompletedAt: Timestamp.now(),
          updatedAt: serverTimestamp(),
        });
      });
    } catch (error) {
      throw normalizeError('Failed to complete profile setup', error);
    }
  },

  async deleteProfileInHousehold(householdId: string, profileId: string): Promise<void> {
    try {
      const firestore = getFirestore();
      const safeHouseholdId = assertNonEmptyString(householdId, 'householdId');
      const safeProfileId = assertNonEmptyString(profileId, 'profileId');
      const profileRef = doc(firestore, `households/${safeHouseholdId}/profiles/${safeProfileId}`);
      const profileSnapshot = await getDoc(profileRef);

      if (!profileSnapshot.exists()) {
        throw new Error('Profile not found in this household.');
      }

      const role = parseRole((profileSnapshot.data() as Record<string, unknown>).role);
      if (role === 'ADMIN') {
        throw new Error('Admin profiles cannot be deleted.');
      }

      await deleteDoc(profileRef);
    } catch (error) {
      throw normalizeError('Failed to delete profile', error);
    }
  },

  async generateInvite(householdId: string, role: 'ADMIN' | 'MEMBER'): Promise<string> {
    try {
      const firestore = getFirestore();
      const safeHouseholdId = assertNonEmptyString(householdId, 'householdId');
      const safeRole: Role = role;
      const token =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID().replace(/-/g, '')
          : Math.random().toString(36).slice(2);

      const inviteExpiry = new Date(Date.now() + DEFAULT_INVITE_EXPIRY_HOURS * 60 * 60 * 1000);

      await addDoc(collection(firestore, 'invites'), {
        householdId: safeHouseholdId,
        role: safeRole,
        token,
        expiresAt: Timestamp.fromDate(inviteExpiry),
        createdAt: serverTimestamp(),
      });

      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      return `${baseUrl}/?join=${token}`;
    } catch (error) {
      throw normalizeError('Failed to generate invite', error);
    }
  },

  async acceptInvite(token: string, name: string, userId?: string): Promise<Profile> {
    try {
      const firestore = getFirestore();
      const safeToken = assertNonEmptyString(token, 'token');
      const safeName = assertNonEmptyString(name, 'name');

      const inviteSnapshot = await getDocs(
        query(collection(firestore, 'invites'), where('token', '==', safeToken), limit(1)),
      );

      if (inviteSnapshot.empty) {
        throw new Error('Invite token is invalid or expired.');
      }

      const inviteDoc = inviteSnapshot.docs[0];
      const invite = inviteDoc.data() as Record<string, unknown>;

      const householdId = assertNonEmptyString(invite.householdId, 'invite.householdId');
      const role = parseRole(invite.role);
      const expiresAt = invite.expiresAt;
      const expiryMs = expiresAt instanceof Timestamp ? expiresAt.toMillis() : NaN;

      if (!Number.isFinite(expiryMs) || expiryMs < Date.now()) {
        throw new Error('Invite token is invalid or expired.');
      }

      const profileRef = doc(getProfilesCollectionRef(householdId));
      const profile: FirestoreProfile = {
        householdId,
        name: safeName,
        role,
        pinHash: '',
        gradeLevel: role === 'CHILD' ? 'Unknown' : 'Adult',
        subjects: [],
        rates: defaultRates(),
        currentHourlyRate: 0,
        balanceCents: 0,
        balance: 0,
      };

      await setDoc(profileRef, {
        ...profile,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      if (userId && userId.trim().length > 0) {
        await setDoc(doc(firestore, `users/${userId}/households/${householdId}`), {
          householdId,
          role,
          profileId: profileRef.id,
          updatedAt: serverTimestamp(),
        });
      }

      await deleteDoc(inviteDoc.ref);

      return {
        id: profileRef.id,
        familyId: householdId,
        ...profile,
      };
    } catch (error) {
      throw normalizeError('Failed to accept invite', error);
    }
  },

  async saveGradeConfigs(householdId: string, configs: GradeConfig[]): Promise<void> {
    try {
      const safeHouseholdId = assertNonEmptyString(householdId, 'householdId');
      const configRef = doc(getFirestore(), `households/${safeHouseholdId}/settings/grade_configs`);

      // Map GradeConfig[] to the { Grade: cents } format
      const payload = configs.reduce((acc, curr) => {
        acc[curr.grade] = curr.valueCents;
        return acc;
      }, {} as Record<string, number>);

      await setDoc(configRef, payload, { merge: true });
    } catch (error) {
      throw normalizeError('Failed to save grade configs', error);
    }
  },

  async getHouseholdActivity(
    householdId: string,
    maxItems = DEFAULT_ACTIVITY_LIMIT,
  ): Promise<Transaction[]> {
    try {
      const safeHouseholdId = assertNonEmptyString(householdId, 'householdId');
      const safeMaxItems = Number.isFinite(maxItems) && maxItems > 0 ? Math.floor(maxItems) : DEFAULT_ACTIVITY_LIMIT;

      const [profilesSnapshot, legacyTransactionsSnapshot] = await Promise.all([
        getDocs(getProfilesCollectionRef(safeHouseholdId)),
        getDocs(getTransactionsCollectionRef(safeHouseholdId)),
      ]);

      const profileNameById = new Map<string, string>();
      profilesSnapshot.docs.forEach((profileDoc) => {
        const profileData = profileDoc.data() as Record<string, unknown>;
        if (typeof profileData.name === 'string') {
          profileNameById.set(profileDoc.id, profileData.name);
        }
      });

      const profileTransactions = (
        await Promise.all(
          profilesSnapshot.docs.map(async (profileDoc) => {
            const transactionsSnapshot = await getDocs(
              getProfileTransactionsCollectionRef(safeHouseholdId, profileDoc.id),
            );
            return transactionsSnapshot.docs.map((transactionDoc) =>
              mapTransaction(
                transactionDoc.id,
                safeHouseholdId,
                transactionDoc.data() as Record<string, unknown>,
              ),
            );
          }),
        )
      ).flat();

      const legacyTransactions = legacyTransactionsSnapshot.docs.map((transactionDoc) =>
        mapTransaction(
          transactionDoc.id,
          safeHouseholdId,
          transactionDoc.data() as Record<string, unknown>,
        ),
      );

      const history = [...profileTransactions, ...legacyTransactions]
        .map((transactionDoc) => {
          if (transactionDoc.profileId) {
            transactionDoc.profileName = profileNameById.get(transactionDoc.profileId) ?? 'Unknown';
          }

          return transactionDoc;
        })
        .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())
        .slice(0, safeMaxItems);

      return history;
    } catch (error) {
      throw normalizeError('Failed to load household activity', error);
    }
  },

  async spawnDailyRecurringTasks(householdId: string, children: Child[]): Promise<void> {
    try {
      const catalogRef = collection(db, 'households', householdId, 'choreCatalog');
      const q = query(catalogRef, where('isRecurring', '==', true));
      const catalogSnapshot = await getDocs(q);

      if (catalogSnapshot.empty) return;

      const recurringItems = catalogSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as ChoreCatalogItem[];

      const batch = writeBatch(db);
      let batchCount = 0;

      // Get start of today in local time (or UTC, to ensure consistency)
      // Using local time for now since it runs client-side on dashboard load
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      // We need to check if tasks were ALREADY spawned today.
      // Since this runs on client, we want to be careful not to duplicate.
      // We will check tasks created >= startOfDay for each child.

      for (const child of children) {
        if (!child.id) continue;

        // Check tasks created today for this child
        const childTasksRef = collection(db, 'households', householdId, 'profiles', child.id, 'tasks');
        // Note: This requires an index on 'createdAt' potentially, or just get recent tasks.
        // Since child task lists are small, we can just get all open tasks or recent tasks.
        // Let's query by createdAt to be safe.
        const tasksQuery = query(
          childTasksRef,
          where('createdAt', '>=', Timestamp.fromDate(startOfDay))
        );

        const tasksSnapshot = await getDocs(tasksQuery);
        const existingCatalogItemIds = new Set();

        tasksSnapshot.forEach(doc => {
          const task = doc.data() as Task;
          if (task.catalogItemId) {
            existingCatalogItemIds.add(task.catalogItemId);
          }
        });

        for (const item of recurringItems) {
          if (!existingCatalogItemIds.has(item.id)) {
            // Spawn task
            const newTaskRef = doc(childTasksRef);
            const multiplier = item.multiplier || 1.0;

            const taskData = {
              householdId,
              name: item.name,
              status: 'ASSIGNED',
              assigneeId: child.id,
              catalogItemId: item.id,
              isRecurring: true,
              multiplier: multiplier,
              baselineMinutes: item.baselineMinutes || 0,
              valueCents: Math.round((item.valueCents || 0) * multiplier),
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            };

            batch.set(newTaskRef, taskData);
            batchCount++;
          }
        }
      }

      if (batchCount > 0) {
        await batch.commit();
      }
    } catch (error) {
      throw normalizeError('Failed to spawn daily recurring tasks', error);
    }
  },

  async requestWithdrawal(profileId: string, amountCents: number, memo: string, householdId: string): Promise<void> {
    try {
      const safeProfileId = assertNonEmptyString(profileId, 'profileId');
      const safeMemo = assertNonEmptyString(memo, 'memo');
      const safeHouseholdId = assertNonEmptyString(householdId, 'householdId');
      const normalizedAmountCents = Math.round(amountCents);

      if (normalizedAmountCents <= 0) {
        throw new Error('amountCents must be a positive integer.');
      }

      await ledgerService.recordWithdrawalRequest({
        firestore: getFirestore(),
        householdId: safeHouseholdId,
        profileId: safeProfileId,
        memo: safeMemo,
        amountCents: normalizedAmountCents,
      });
    } catch (error) {
      throw normalizeError('Failed to request withdrawal', error);
    }
  },

  async transferToGoal(profileId: string, goalId: string, amountCents: number, householdId: string): Promise<void> {
    try {
      const safeProfileId = assertNonEmptyString(profileId, 'profileId');
      const safeGoalId = assertNonEmptyString(goalId, 'goalId');
      const safeHouseholdId = assertNonEmptyString(householdId, 'householdId');
      const normalizedAmountCents = Math.round(amountCents);

      if (normalizedAmountCents <= 0) {
        throw new Error('amountCents must be a positive integer.');
      }

      await ledgerService.recordGoalAllocation({
        firestore: getFirestore(),
        householdId: safeHouseholdId,
        profileId: safeProfileId,
        goalId: safeGoalId,
        amountCents: normalizedAmountCents,
        memo: `Transfer to Goal`,
      });
    } catch (error) {
      throw normalizeError('Failed to transfer to goal', error);
    }
  },

  async addSavingsGoal(profileId: string, name: string, targetAmountCents: number, householdId: string): Promise<void> {
    try {
      const safeProfileId = assertNonEmptyString(profileId, 'profileId');
      const safeName = assertNonEmptyString(name, 'name');
      const safeHouseholdId = assertNonEmptyString(householdId, 'householdId');
      const normalizedTargetCents = Math.round(targetAmountCents);

      if (normalizedTargetCents <= 0) {
        throw new Error('targetAmountCents must be a positive integer.');
      }

      const firestore = getFirestore();
      const profileRef = doc(firestore, `households/${safeHouseholdId}/profiles/${safeProfileId}`);

      await runTransaction(firestore, async (transaction) => {
        const profileSnap = await transaction.get(profileRef);
        if (!profileSnap.exists()) throw new Error('Profile not found.');

        const data = profileSnap.data() as Record<string, unknown>;
        const goals = (data.goals as any[]) || [];

        const newGoal = {
          id: crypto.randomUUID(),
          name: safeName,
          targetAmountCents: normalizedTargetCents,
          currentAmountCents: 0,
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
        };

        transaction.update(profileRef, {
          goals: [...goals, newGoal],
          updatedAt: serverTimestamp(),
        });
      });
    } catch (error) {
      throw normalizeError('Failed to add savings goal', error);
    }
  },

  async updateSavingsGoal(profileId: string, goalId: string, name: string, targetAmountCents: number, householdId: string): Promise<void> {
    try {
      const safeProfileId = assertNonEmptyString(profileId, 'profileId');
      const safeGoalId = assertNonEmptyString(goalId, 'goalId');
      const safeName = assertNonEmptyString(name, 'name');
      const safeHouseholdId = assertNonEmptyString(householdId, 'householdId');
      const normalizedTargetCents = Math.round(targetAmountCents);

      if (normalizedTargetCents <= 0) {
        throw new Error('targetAmountCents must be a positive integer.');
      }

      const firestore = getFirestore();
      const profileRef = doc(firestore, `households/${safeHouseholdId}/profiles/${safeProfileId}`);

      await runTransaction(firestore, async (transaction) => {
        const profileSnap = await transaction.get(profileRef);
        if (!profileSnap.exists()) throw new Error('Profile not found.');

        const data = profileSnap.data() as Record<string, unknown>;
        const goals = (data.goals as any[]) || [];
        const goalIndex = goals.findIndex((g: any) => g.id === safeGoalId);
        if (goalIndex === -1) throw new Error('Goal not found.');

        if (normalizedTargetCents < goals[goalIndex].currentAmountCents) {
          throw new Error('Target amount cannot be less than the currently saved amount.');
        }

        const updatedGoals = [...goals];
        updatedGoals[goalIndex] = {
          ...updatedGoals[goalIndex],
          name: safeName,
          targetAmountCents: normalizedTargetCents,
        };

        transaction.update(profileRef, {
          goals: updatedGoals,
          updatedAt: serverTimestamp(),
        });
      });
    } catch (error) {
      throw normalizeError('Failed to update savings goal', error);
    }
  },

  async deleteSavingsGoal(profileId: string, goalId: string, householdId: string): Promise<void> {
    try {
      const safeProfileId = assertNonEmptyString(profileId, 'profileId');
      const safeGoalId = assertNonEmptyString(goalId, 'goalId');
      const safeHouseholdId = assertNonEmptyString(householdId, 'householdId');

      const firestore = getFirestore();
      const profileRef = doc(firestore, `households/${safeHouseholdId}/profiles/${safeProfileId}`);

      await runTransaction(firestore, async (transaction) => {
        const profileSnap = await transaction.get(profileRef);
        if (!profileSnap.exists()) throw new Error('Profile not found.');

        const data = profileSnap.data() as Record<string, unknown>;
        const goals = (data.goals as any[]) || [];
        const goalIndex = goals.findIndex((g: any) => g.id === safeGoalId);
        if (goalIndex === -1) throw new Error('Goal not found.');

        const goal = goals[goalIndex];
        const updatedGoals = goals.filter((g: any) => g.id !== safeGoalId);
        const updates: Record<string, any> = {
          goals: updatedGoals,
          updatedAt: serverTimestamp(),
        };

        if (goal.currentAmountCents > 0) {
          const newBalanceCents = (data.balanceCents as number || 0) + goal.currentAmountCents;
          updates.balanceCents = newBalanceCents;
          updates.balance = centsToDollars(newBalanceCents);

          const transferRef = doc(collection(firestore, `households/${safeHouseholdId}/profiles/${safeProfileId}/transactions`));
          transaction.set(transferRef, {
            date: serverTimestamp(),
            amountCents: goal.currentAmountCents,
            amount: centsToDollars(goal.currentAmountCents),
            memo: `Refund from deleted goal: ${goal.name}`,
            type: 'ADJUSTMENT'
          });
        }

        transaction.update(profileRef, updates);
      });
    } catch (error) {
      throw normalizeError('Failed to delete savings goal', error);
    }
  },


  async claimGoal(profileId: string, goalId: string, householdId: string): Promise<void> {
    try {
      const safeProfileId = assertNonEmptyString(profileId, 'profileId');
      const safeGoalId = assertNonEmptyString(goalId, 'goalId');
      const safeHouseholdId = assertNonEmptyString(householdId, 'householdId');

      const firestore = getFirestore();
      const profileRef = doc(firestore, `households/${safeHouseholdId}/profiles/${safeProfileId}`);

      await runTransaction(firestore, async (transaction) => {
        const profileSnap = await transaction.get(profileRef);
        if (!profileSnap.exists()) throw new Error('Profile not found.');

        const data = profileSnap.data() as Record<string, unknown>;
        const goals = (data.goals as any[]) || [];
        const goalIndex = goals.findIndex((g: any) => g.id === safeGoalId);
        if (goalIndex === -1) throw new Error('Goal not found.');

        goals[goalIndex].status = 'CLAIMED';
        goals[goalIndex].claimedAt = serverTimestamp();

        transaction.update(profileRef, {
          goals,
          updatedAt: serverTimestamp(),
        });
      });
    } catch (error) {
      throw normalizeError('Failed to claim goal', error);
    }
  },

  async confirmWithdrawalPayout(profileId: string, transactionId: string, amountCents: number, householdId: string): Promise<void> {
    try {
      const safeProfileId = assertNonEmptyString(profileId, 'profileId');
      const safeTransactionId = assertNonEmptyString(transactionId, 'transactionId');
      const safeHouseholdId = assertNonEmptyString(householdId, 'householdId');

      await ledgerService.finalizeWithdrawal({
        firestore: getFirestore(),
        householdId: safeHouseholdId,
        profileId: safeProfileId,
        transactionId: safeTransactionId,
        amountCents,
        memo: 'Withdrawal Payout Confirmed',
      });
    } catch (error) {
      throw normalizeError('Failed to confirm payout', error);
    }
  },

  async rejectTask(householdId: string, taskId: string, rejectionComment: string, assigneeId: string): Promise<void> {
    try {
      const firestore = getFirestore();
      const safeTaskId = assertNonEmptyString(taskId, 'taskId');
      const safeComment = assertNonEmptyString(rejectionComment, 'rejectionComment');
      const safeAssigneeId = assertNonEmptyString(assigneeId, 'assigneeId');

      const result = await resolveTaskLocationById(safeTaskId, householdId, safeAssigneeId);
      if (!result) {
        throw new Error('Task not found');
      }

      const taskRef = doc(firestore, `households/${result.householdId}/profiles/${result.profileId}/tasks/${result.taskId}`);
      await updateDoc(taskRef, {
        status: 'ASSIGNED',
        rejectionComment: safeComment,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      throw normalizeError('Failed to reject task', error);
    }
  },

  async boostTask(householdId: string, taskId: string, bonusCentsDelta: number, assigneeId: string): Promise<void> {
    try {
      const firestore = getFirestore();
      const safeTaskId = assertNonEmptyString(taskId, 'taskId');
      const safeAssigneeId = assertNonEmptyString(assigneeId, 'assigneeId');

      const result = await resolveTaskLocationById(safeTaskId, householdId, safeAssigneeId);
      if (!result) {
        throw new Error('Task not found');
      }

      const taskRef = doc(firestore, `households/${result.householdId}/profiles/${result.profileId}/tasks/${result.taskId}`);

      await runTransaction(firestore, async (transaction) => {
        const docSnap = await transaction.get(taskRef);
        if (!docSnap.exists()) throw new Error("Task does not exist");

        const data = docSnap.data();
        const currentBonus = typeof data.bonusCents === 'number' ? data.bonusCents : 0;
        const newBonus = currentBonus + bonusCentsDelta;

        transaction.update(taskRef, {
          bonusCents: newBonus,
          updatedAt: serverTimestamp()
        });
      });
    } catch (error) {
      throw normalizeError('Failed to boost task', error);
    }
  },

  async updateTaskStatus(householdId: string, taskId: string, status: string, profileId?: string): Promise<void> {
    return this.updateTaskById(taskId, { status: status as any }, profileId);
  }
};

export const verifyProfilePin = async (
  householdId: string,
  profileId: string,
  pin: string,
): Promise<boolean> => {
  return householdService.verifyProfilePinInHousehold(householdId, profileId, pin);
};

export const setProfilePin = async (
  householdId: string,
  profileId: string,
  pin: string,
): Promise<void> => {
  await householdService.setProfilePinInHousehold(householdId, profileId, pin);
};

export const saveGradeConfigs = async (
  householdId: string,
  configs: GradeConfig[],
): Promise<void> => {
  return householdService.saveGradeConfigs(householdId, configs);
};

export const updateTaskStatus = async (
  householdId: string,
  taskId: string,
  status: string,
  profileId?: string,
): Promise<void> => {
  return householdService.updateTaskStatus(householdId, taskId, status, profileId);
};
