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
} from 'firebase/firestore';
import {
  AdvanceCategory,
  ChoreCatalogItem,
  Child,
  Grade,
  GradeConfig,
  Household,
  Profile,
  Role,
  Subject,
  Task,
  TaskStatus,
  Transaction,
} from '@/types';
import { auth, db, ensureFirebaseConfigured } from '@/services/firebase';
import { ledgerService } from '@/services/ledgerService';
import { centsToDollars, dollarsToCents } from '@/utils';

const ACTIVE_PROFILE_STORAGE_KEY = 'homework-active-profile';
const DEFAULT_INVITE_EXPIRY_HOURS = 24;
const DEFAULT_ACTIVITY_LIMIT = 10;
const DEFAULT_PROFILE_SETUP_EXPIRY_HOURS = 24;

type FirestoreProfile = Omit<Profile, 'id' | 'familyId'>;

type FirestoreTask = Omit<Task, 'id' | 'familyId'>;

interface StoredActiveProfile {
  householdId?: string;
  familyId?: string;
  profileId?: string;
  role?: Role;
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
    return new Error(`${context}: ${error.message}`);
  }

  return new Error(`${context}: Unknown error`);
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

const parseRole = (value: unknown): Role => {
  if (value === 'ADMIN' || value === 'CHILD' || value === 'MEMBER') {
    return value;
  }

  return 'MEMBER';
};

const parseTaskStatus = (value: unknown): TaskStatus => {
  const supported: TaskStatus[] = [
    'DRAFT',
    'OPEN',
    'ASSIGNED',
    'PENDING_APPROVAL',
    'PENDING_PAYMENT',
    'PAID',
    'DELETED',
  ];

  if (typeof value === 'string' && supported.includes(value as TaskStatus)) {
    return value as TaskStatus;
  }

  return 'OPEN';
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

const mapProfile = (profileId: string, householdId: string, source: Record<string, unknown>): Profile => {
  const balanceCents = parseBalanceCents(source);

  return {
    id: profileId,
    householdId,
    familyId: householdId,
    name: typeof source.name === 'string' ? source.name : 'Unknown Profile',
    role: parseRole(source.role),
    pinHash: typeof source.pinHash === 'string' ? source.pinHash : undefined,
    avatarColor: typeof source.avatarColor === 'string' ? source.avatarColor : undefined,
    gradeLevel: typeof source.gradeLevel === 'string' ? source.gradeLevel : 'Unknown',
    subjects: parseSubjects(source.subjects),
    rates: parseRates(source.rates),
    balanceCents,
    balance: centsToDollars(balanceCents),
  };
};

const mapTask = (taskId: string, householdId: string, source: Record<string, unknown>): Task => {
  return {
    id: taskId,
    householdId,
    familyId: householdId,
    name: typeof source.name === 'string' ? source.name : 'Untitled Task',
    baselineMinutes: typeof source.baselineMinutes === 'number' ? source.baselineMinutes : 0,
    status: parseTaskStatus(source.status),
    rejectionComment: typeof source.rejectionComment === 'string' ? source.rejectionComment : undefined,
    assigneeId: typeof source.assigneeId === 'string' ? source.assigneeId : null,
    catalogItemId: typeof source.catalogItemId === 'string' ? source.catalogItemId : null,
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
): Promise<{ householdId: string; taskId: string } | null> => {
  const safeTaskId = assertNonEmptyString(taskId, 'taskId');
  const firestore = getFirestore();
  const candidateHouseholdIds = await getCandidateHouseholdIds(householdId);

  for (const candidateHouseholdId of candidateHouseholdIds) {
    const taskSnapshot = await getDoc(doc(firestore, `households/${candidateHouseholdId}/tasks/${safeTaskId}`));
    if (taskSnapshot.exists()) {
      return { householdId: candidateHouseholdId, taskId: safeTaskId };
    }
  }

  return null;
};

export const householdService = {
  async getUserRoleInHousehold(userId: string, householdId: string): Promise<Role | null> {
    try {
      const firestore = getFirestore();
      const safeUserId = assertNonEmptyString(userId, 'userId');
      const safeHouseholdId = assertNonEmptyString(householdId, 'householdId');
      const membershipSnapshot = await getDoc(
        doc(firestore, `users/${safeUserId}/households/${safeHouseholdId}`),
      );

      if (!membershipSnapshot.exists()) {
        return null;
      }

      return parseRole((membershipSnapshot.data() as Record<string, unknown>).role);
    } catch (error) {
      throw normalizeError('Failed to load user household role', error);
    }
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
        }),
      );

      return childrenSnapshot.docs.map((childDoc) => {
        const profile = mapProfile(childDoc.id, safeHouseholdId, childDoc.data() as Record<string, unknown>);
        const childTasks = allTasks.filter(
          (task) => task.assigneeId === childDoc.id && task.status !== 'PAID' && task.status !== 'DELETED',
        );
        const childHistory = [...(profileTransactionsByProfileId.get(childDoc.id) ?? []), ...legacyTransactions]
          .filter((transaction) => transaction.profileId === childDoc.id)
          .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())
          .slice(0, 20);

        return {
          ...profile,
          pin: profile.pinHash ? '****' : '',
          history: childHistory,
          customTasks: childTasks,
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
      const childProfile: FirestoreProfile = {
        householdId: safeHouseholdId,
        name: childName,
        role: 'CHILD',
        pinHash: '',
        gradeLevel,
        subjects,
        rates,
        balanceCents: 0,
        balance: 0,
      };

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
      const profile: FirestoreProfile = {
        householdId: safeHouseholdId,
        name: profileName,
        role: 'CHILD',
        pinHash,
        avatarColor: typeof payload.avatarColor === 'string' ? payload.avatarColor : '#3b82f6',
        gradeLevel: 'Unknown',
        subjects: [],
        rates: defaultRates(),
        balanceCents: 0,
        balance: 0,
      };

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

  async createTask(
    householdId: string,
    task: Task,
    options?: { saveToCatalog?: boolean; catalogItemId?: string | null },
  ): Promise<Task> {
    try {
      const safeHouseholdId = assertNonEmptyString(householdId, 'householdId');
      const safeTaskName = assertNonEmptyString(task.name, 'task.name');
      const status = parseTaskStatus(task.status);

      const taskCollection = getTasksCollectionRef(safeHouseholdId);
      const taskRef =
        typeof task.id === 'string' && task.id.trim().length > 0
          ? doc(taskCollection, task.id)
          : doc(taskCollection);

      const firestoreTask: FirestoreTask = {
        householdId: safeHouseholdId,
        name: safeTaskName,
        baselineMinutes: Number.isFinite(task.baselineMinutes) ? task.baselineMinutes : 0,
        status,
        rejectionComment: task.rejectionComment,
        assigneeId: typeof task.assigneeId === 'string' ? task.assigneeId : null,
        catalogItemId:
          typeof options?.catalogItemId === 'string'
            ? options.catalogItemId
            : typeof task.catalogItemId === 'string'
              ? task.catalogItemId
              : null,
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

  async updateTaskById(taskId: string, updates: Partial<Task>): Promise<void> {
    try {
      const safeTaskId = assertNonEmptyString(taskId, 'taskId');
      const resolvedTask = await resolveTaskLocationById(safeTaskId);

      if (!resolvedTask) {
        throw new Error('Task not found.');
      }

      const firestore = getFirestore();
      const taskRef = doc(firestore, `households/${resolvedTask.householdId}/tasks/${resolvedTask.taskId}`);

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
    householdId?: string,
  ): Promise<void> {
    try {
      const safeProfileId = assertNonEmptyString(profileId, 'profileId');
      const safeTaskId = assertNonEmptyString(taskId, 'taskId');
      const safeMemo = assertNonEmptyString(memo, 'memo');

      const firestore = getFirestore();

      const normalizedAmountCents = Math.round(amountCents);
      if (!Number.isFinite(normalizedAmountCents) || normalizedAmountCents <= 0) {
        throw new Error('amountCents must be a positive integer.');
      }

      const resolvedProfileHouseholdId =
        typeof householdId === 'string' && householdId.trim().length > 0
          ? householdId.trim()
          : (await resolveProfileLocationById(safeProfileId))?.householdId;

      if (!resolvedProfileHouseholdId) {
        throw new Error('Profile not found.');
      }

      await ledgerService.recordTaskPayment({
        firestore,
        householdId: resolvedProfileHouseholdId,
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
    householdId?: string,
  ): Promise<void> {
    try {
      const safeProfileId = assertNonEmptyString(profileId, 'profileId');
      const safeMemo = assertNonEmptyString(memo, 'memo');

      const safeCategory = parseAdvanceCategory(category) ?? 'Other';

      const firestore = getFirestore();

      const normalizedAmountCents = Math.round(amountCents);
      if (!Number.isFinite(normalizedAmountCents) || normalizedAmountCents <= 0) {
        throw new Error('amountCents must be a positive integer.');
      }

      const resolvedProfileHouseholdId =
        typeof householdId === 'string' && householdId.trim().length > 0
          ? householdId.trim()
          : (await resolveProfileLocationById(safeProfileId))?.householdId;

      if (!resolvedProfileHouseholdId) {
        throw new Error('Profile not found.');
      }

      await ledgerService.recordAdvance({
        firestore,
        householdId: resolvedProfileHouseholdId,
        profileId: safeProfileId,
        amountCents: normalizedAmountCents,
        memo: safeMemo,
        category: safeCategory,
      });
    } catch (error) {
      throw normalizeError('Failed to apply advance', error);
    }
  },

  async addManualAdjustment(
    profileId: string,
    amountCents: number,
    memo: string,
    householdId?: string,
  ): Promise<void> {
    try {
      const safeProfileId = assertNonEmptyString(profileId, 'profileId');
      const safeMemo = assertNonEmptyString(memo, 'memo');
      const normalizedAmountCents = Math.round(amountCents);
      if (!Number.isFinite(normalizedAmountCents) || normalizedAmountCents === 0) {
        throw new Error('amountCents must be a non-zero integer.');
      }

      const resolvedProfileHouseholdId =
        typeof householdId === 'string' && householdId.trim().length > 0
          ? householdId.trim()
          : (await resolveProfileLocationById(safeProfileId))?.householdId;

      if (!resolvedProfileHouseholdId) {
        throw new Error('Profile not found.');
      }

      await ledgerService.recordManualAdjustment({
        firestore: getFirestore(),
        householdId: resolvedProfileHouseholdId,
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
  }): Promise<void> {
    try {
      const firestore = getFirestore();
      const safeHouseholdId = assertNonEmptyString(input.householdId, 'householdId');
      const safeProfileId = assertNonEmptyString(input.profileId, 'profileId');
      const safeToken = assertNonEmptyString(input.token, 'token');
      const safePin = assertNonEmptyString(input.pin, 'pin');
      const safeAvatarColor = assertNonEmptyString(input.avatarColor, 'avatarColor');

      if (!/^\d{4}$/.test(safePin)) {
        throw new Error('PIN must be exactly 4 digits.');
      }

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

        transaction.update(profileRef, {
          pinHash,
          avatarColor: safeAvatarColor,
          setupTokenHash: null,
          setupTokenUsedAt: Timestamp.now(),
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
};
