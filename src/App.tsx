import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { signOut, User, onAuthStateChanged } from 'firebase/auth';
import { collection, collectionGroup, onSnapshot, query, where } from 'firebase/firestore';
import { ArrowRight, Briefcase, Calendar, Check, DollarSign, GraduationCap, Loader2, LogOut, Plus, Share2, UserPlus, Users } from 'lucide-react';
import { Button } from './components/ui/Button';
import { Input } from './components/ui/Input';
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import { COMMON_TASKS, DEFAULT_RATES } from '@/constants';
import { appConfig } from '@/services/config';
import AddAdvanceModal from '@/components/AddAdvanceModal';
import AddChildModal, { NewChildData } from '@/components/AddChildModal';
import AssignTaskModal, { AssignTaskPayload } from '@/components/AssignTaskModal';
import CatalogManagerModal from '@/components/CatalogManagerModal';
import ChildCard from '@/components/ChildCard';
import ChildDetail from '@/components/ChildDetail';
import ChildDashboard from '@/components/ChildDashboard';
import FamilyActivityFeed from '@/components/FamilyActivityFeed';
import SettingsModal from '@/components/SettingsModal';
import AuthScreen from '@/components/AuthScreen';
import AdminSetupRail from '@/components/AdminSetupRail';
import LandingPage from '@/components/LandingPage';
import PinModal from '@/components/PinModal';
import OpenTaskCard from '@/components/OpenTaskCard';
import UpdateGradesModal from '@/components/UpdateGradesModal';
import Modal from '@/components/Modal';
import ErrorBoundary from './components/ErrorBoundary';
import { auth, db, isFirebaseConfigured } from '@/services/firebase';
import { householdService } from '@/services/householdService';
import { notificationService } from '@/services/notificationService';
import { Child, Grade, GradeConfig, Profile, ProfileSetupStatus, Subject, Task } from '@/types';
import {
  buildRateMapFromGradeConfigs,
  calculateHourlyRate,
  calculateTaskValueCents,
  centsToDollars,
  dollarsToCents,
  formatCurrency,
  mapTask,
} from '@/utils';
import { isValidChildUsername, normalizeChildUsername } from '@/features/auth/childCredentials';
import { shouldBypassPinVerification } from '@/features/auth/sessionGate';

type FamilyAuthStage = 'UNAUTHENTICATED' | 'HOUSEHOLD_LOADED' | 'PROFILE_SELECTED' | 'AUTHORIZED';

interface PersistedSession {
  householdId?: string;
  familyId?: string;
  profileId?: string;
  role?: Profile['role'];
}

const REJECTION_TAGS = [
  'Missing Photo',
  'Not Finished',
  'Try Again',
  'See Notes',
];

interface FamilyAuthState {
  stage: FamilyAuthStage;
  user: User | null;
  householdId: string | null;
  profiles: Profile[];
  activeProfile: Profile | null;
  canManageProfiles: boolean;
  isInitializing: boolean;
  isProfilesLoading: boolean;
  profilesError: string | null;
  selectProfile: (profileId: string) => void;
  appendCreatedProfile: (profile: Profile) => void;
  authorizeActiveProfile: () => void;
  clearActiveProfileSelection: () => void;
  signOutUser: () => Promise<void>;
}

const ACTIVE_PROFILE_STORAGE_KEY = 'homework-active-profile';

const readPersistedSession = (): PersistedSession => {
  const rawSession = localStorage.getItem(ACTIVE_PROFILE_STORAGE_KEY);
  if (!rawSession) {
    return {};
  }

  try {
    return JSON.parse(rawSession) as PersistedSession;
  } catch {
    return {};
  }
};

const persistSession = (session: PersistedSession): void => {
  localStorage.setItem(ACTIVE_PROFILE_STORAGE_KEY, JSON.stringify(session));
};

const defaultRates = () => {
  return Object.values(Grade).reduce((accumulator, grade) => {
    accumulator[grade] = 0;
    return accumulator;
  }, {} as Record<Grade, number>);
};

const parseProfileSetupStatus = (value: unknown): ProfileSetupStatus => {
  if (value === 'INVITE_SENT' || value === 'SETUP_COMPLETE' || value === 'PROFILE_CREATED') {
    return value;
  }
  return 'PROFILE_CREATED';
};

const parseOptionalIsoString = (value: unknown): string | null => {
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }
  if (value && typeof value === 'object' && 'toDate' in value) {
    const timestampLike = value as { toDate: () => Date };
    return timestampLike.toDate().toISOString();
  }
  return null;
};

const mapFirestoreProfile = (
  profileId: string,
  householdId: string,
  source: Record<string, unknown>,
): Profile => {
  const balanceCents =
    typeof source.balanceCents === 'number'
      ? Math.round(source.balanceCents)
      : typeof source.balance === 'number'
        ? dollarsToCents(source.balance)
        : 0;

  return {
    id: profileId,
    householdId,
    familyId: householdId,
    name: typeof source.name === 'string' ? source.name : 'Unknown Profile',
    role:
      source.role === 'ADMIN' || source.role === 'CHILD' || source.role === 'MEMBER'
        ? source.role
        : 'MEMBER',
    pinHash: typeof source.pinHash === 'string' ? source.pinHash : undefined,
    avatarColor: typeof source.avatarColor === 'string' ? source.avatarColor : undefined,
    gradeLevel: typeof source.gradeLevel === 'string' ? source.gradeLevel : 'Unknown',
    subjects: Array.isArray(source.subjects) ? (source.subjects as Profile['subjects']) : [],
    rates:
      source.rates && typeof source.rates === 'object'
        ? (source.rates as Profile['rates'])
        : defaultRates(),
    currentHourlyRate: typeof source.currentHourlyRate === 'number' ? source.currentHourlyRate : 0,
    balanceCents,
    balance: centsToDollars(balanceCents),
    goals: Array.isArray(source.goals)
      ? source.goals.map((goal: any) => ({
        id: goal.id,
        name: goal.name,
        targetAmountCents: goal.targetAmountCents,
        currentAmountCents: goal.currentAmountCents,
        status: goal.status,
        createdAt: parseOptionalIsoString(goal.createdAt),
      }))
      : [],
    setupStatus: parseProfileSetupStatus(source.setupStatus),
    inviteLastSentAt: parseOptionalIsoString(source.inviteLastSentAt),
    setupCompletedAt: parseOptionalIsoString(source.setupCompletedAt),
  };
};

export function useFamilyAuth(): FamilyAuthState {
  const [stage, setStage] = useState<FamilyAuthStage>('UNAUTHENTICATED');
  const [user, setUser] = useState<User | null>(null);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isProfilesLoading, setIsProfilesLoading] = useState(false);
  const [profilesError, setProfilesError] = useState<string | null>(null);
  const [canManageProfiles, setCanManageProfiles] = useState(false);

  React.useEffect(() => {
    if (!auth || !isFirebaseConfigured) {
      setStage('UNAUTHENTICATED');
      setIsInitializing(false);
      return;
    }

    const unsubscribeAuth = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);

      if (!nextUser) {
        setStage('UNAUTHENTICATED');
        setHouseholdId(null);
        setProfiles([]);
        setActiveProfileId(null);
        setCanManageProfiles(false);
        setIsInitializing(false);
        return;
      }

      try {
        const resolvedHousehold = await householdService.getCurrentHousehold(nextUser.uid);

        if (!resolvedHousehold) {
          setStage('UNAUTHENTICATED');
          setHouseholdId(null);
          setProfiles([]);
          setActiveProfileId(null);
          setCanManageProfiles(false);
          setIsInitializing(false);
          return;
        }

        const storedSession = readPersistedSession();
        setHouseholdId(resolvedHousehold.id);
        setStage('HOUSEHOLD_LOADED');
        setActiveProfileId(storedSession.profileId ?? null);
        persistSession({
          ...storedSession,
          householdId: resolvedHousehold.id,
          familyId: resolvedHousehold.id,
        });
      } catch {
        setStage('UNAUTHENTICATED');
        setHouseholdId(null);
        setProfiles([]);
        setActiveProfileId(null);
        setCanManageProfiles(false);
      } finally {
        setIsInitializing(false);
      }
    });

    return unsubscribeAuth;
  }, []);

  React.useEffect(() => {
    if (!user || !householdId) {
      setCanManageProfiles(false);
      return;
    }

    let isMounted = true;
    void householdService
      .getUserRoleInHousehold(user.uid, householdId)
      .then((role) => {
        if (isMounted) {
          setCanManageProfiles(role === 'ADMIN');
        }
      })
      .catch(() => {
        if (isMounted) {
          setCanManageProfiles(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [user, householdId]);

  React.useEffect(() => {
    if (!householdId || !db) {
      setProfiles([]);
      setProfilesError(null);
      return;
    }

    setIsProfilesLoading(true);
    setProfilesError(null);
    const profilesQuery = query(collection(db, `households/${householdId}/profiles`));

    const unsubscribeProfiles = onSnapshot(
      profilesQuery,
      (snapshot) => {
        const nextProfiles = snapshot.docs
          .map((profileDoc) => {
            return mapFirestoreProfile(
              profileDoc.id,
              householdId,
              profileDoc.data() as Record<string, unknown>,
            );
          })
          .sort((left, right) => {
            if (left.role !== right.role) {
              return left.role.localeCompare(right.role);
            }

            return left.name.localeCompare(right.name);
          });

        setProfiles(nextProfiles);
        setIsProfilesLoading(false);
        setProfilesError(null);

        if (nextProfiles.length === 0) {
          setStage('HOUSEHOLD_LOADED');
          setActiveProfileId(null);
          return;
        }

        const adminProfile = nextProfiles.find((profile) => profile.role === 'ADMIN') ?? null;
        if (adminProfile) {
          if (activeProfileId !== adminProfile.id) {
            setActiveProfileId(adminProfile.id);
            persistSession({
              householdId,
              familyId: householdId,
              profileId: adminProfile.id,
              role: adminProfile.role,
            });
          }
          setStage('AUTHORIZED');
          return;
        }

        if (!activeProfileId) {
          return;
        }

        const selectedProfile = nextProfiles.find((profile) => profile.id === activeProfileId) ?? null;

        if (!selectedProfile) {
          setActiveProfileId(null);
          setStage('HOUSEHOLD_LOADED');
          persistSession({ householdId, familyId: householdId });
          return;
        }

        if (stage === 'AUTHORIZED') {
          return;
        }

        const storedSession = readPersistedSession();
        if (
          shouldBypassPinVerification({
            persistedRole: storedSession.role,
            persistedProfileId: storedSession.profileId,
            activeProfileId: selectedProfile.id,
          })
        ) {
          setStage('AUTHORIZED');
          return;
        }

        if (selectedProfile.pinHash && selectedProfile.pinHash.length > 0) {
          setStage('PROFILE_SELECTED');
          return;
        }

        setStage('AUTHORIZED');
      },
      (error) => {
        console.error('Failed to subscribe to household profiles', error);
        setIsProfilesLoading(false);
        setProfilesError(error instanceof Error ? error.message : 'Unable to load profiles.');
      },
    );

    return unsubscribeProfiles;
  }, [householdId, activeProfileId, stage, canManageProfiles]);

  const activeProfile = useMemo(() => {
    if (!activeProfileId) {
      return null;
    }

    return profiles.find((profile) => profile.id === activeProfileId) ?? null;
  }, [activeProfileId, profiles]);

  const selectProfile = React.useCallback(
    (profileId: string) => {
      if (!householdId) {
        return;
      }

      const selectedProfile = profiles.find((profile) => profile.id === profileId) ?? null;
      if (!selectedProfile) {
        return;
      }

      setActiveProfileId(profileId);
      persistSession({
        householdId,
        familyId: householdId,
        profileId,
        role: selectedProfile.role,
      });

      if (selectedProfile.pinHash && selectedProfile.pinHash.length > 0) {
        setStage('PROFILE_SELECTED');
      } else {
        setStage('AUTHORIZED');
      }
    },
    [householdId, profiles],
  );

  const appendCreatedProfile = React.useCallback((profile: Profile) => {
    setProfiles((previous) => {
      const exists = previous.some((candidate) => candidate.id === profile.id);
      if (exists) {
        return previous;
      }

      return [...previous, profile].sort((left, right) => {
        if (left.role !== right.role) {
          return left.role.localeCompare(right.role);
        }
        return left.name.localeCompare(right.name);
      });
    });
    setProfilesError(null);
  }, []);

  const authorizeActiveProfile = React.useCallback(() => {
    if (!householdId || !activeProfileId || !activeProfile) {
      return;
    }

    persistSession({
      householdId,
      familyId: householdId,
      profileId: activeProfileId,
      role: activeProfile.role,
    });

    setStage('AUTHORIZED');
  }, [householdId, activeProfileId, activeProfile]);

  const clearActiveProfileSelection = React.useCallback(() => {
    if (!householdId) {
      setActiveProfileId(null);
      setStage('HOUSEHOLD_LOADED');
      return;
    }

    setActiveProfileId(null);
    setStage('HOUSEHOLD_LOADED');
    persistSession({ householdId, familyId: householdId });
  }, [householdId]);

  const signOutUser = React.useCallback(async () => {
    if (!auth) {
      return;
    }

    await signOut(auth);
    persistSession({});
  }, []);

  return {
    stage,
    user,
    householdId,
    profiles,
    activeProfile,
    canManageProfiles,
    isInitializing,
    isProfilesLoading,
    profilesError,
    selectProfile,
    appendCreatedProfile,
    authorizeActiveProfile,
    clearActiveProfileSelection,
    signOutUser,
  };
}

function DashboardPage() {
  const queryClient = useQueryClient();
  const familyAuth = useFamilyAuth();
  const householdId = familyAuth.householdId;

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [taskStreamError, setTaskStreamError] = useState<string | null>(null);

  // Unified listener for ALL tasks in root and sub-collections
  React.useEffect(() => {
    if (!householdId || !db) {
      setTasks([]);
      setLoadingTasks(false);
      return;
    }

    setLoadingTasks(true);
    setTaskStreamError(null);

    // Unified listener for ALL tasks in root and sub-collections.
    // Requires a collection-group field override index on `householdId`
    // (COLLECTION_GROUP scope) — see firestore.indexes.json.
    const q = query(
      collectionGroup(db, 'tasks'),
      where('householdId', '==', householdId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allTasks = snapshot.docs.map((d) =>
        mapTask(d.id, householdId, d.data() as Record<string, unknown>)
      );
      console.log('Fetched Tasks:', allTasks);
      setTasks(allTasks);
      setLoadingTasks(false);
      setTaskStreamError(null);
    }, (error) => {
      console.error('Task stream failure:', error);
      setLoadingTasks(false);
      // Surface permission-denied and index-missing errors so they're visible
      // in the UI rather than silently producing an empty task list.
      if ((error as { code?: string }).code === 'permission-denied') {
        setTaskStreamError('Permission denied reading tasks. Check Firestore security rules.');
      } else if ((error as { code?: string }).code === 'failed-precondition') {
        setTaskStreamError('Task index not ready. Run: firebase deploy --only firestore:indexes');
      } else {
        setTaskStreamError(`Task stream error: ${error.message}`);
      }
    });

    return () => unsubscribe();
  }, [householdId]);

  // Family Bank: Spawn daily recurring tasks
  React.useEffect(() => {
    if (householdId && familyAuth.profiles.length > 0) {
      const children = familyAuth.profiles.filter(p => p.role === 'CHILD') as Child[];
      householdService.spawnDailyRecurringTasks(householdId, children).catch(err => console.error("Failed to spawn recurring tasks", err));
    }
  }, [householdId, familyAuth.profiles]);

  const { data: gradeConfigs = [] } = useQuery<GradeConfig[]>({
    queryKey: ['gradeConfigs', householdId],
    queryFn: () => (householdId ? householdService.getGradeConfigs(householdId) : Promise.resolve([])),
    enabled: familyAuth.stage === 'AUTHORIZED' && !!householdId,
  });

  const openTasks = useMemo(() => {
    return tasks.filter(t => t.status === 'OPEN');
  }, [tasks]);

  const { data: choreCatalog = [] } = useQuery({
    queryKey: ['choreCatalog', householdId],
    queryFn: () => (householdId ? householdService.getChoreCatalog(householdId) : Promise.resolve([])),
    enabled: familyAuth.stage === 'AUTHORIZED' && !!householdId,
  });

  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [isAddChildModalOpen, setIsAddChildModalOpen] = useState(false);
  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const [isOpenTaskMode, setIsOpenTaskMode] = useState(false);
  const [editingTask, setEditingTask] = useState<{ childId: string | null; task: Task } | null>(null);
  const [childToEdit, setChildToEdit] = useState<Child | null>(null);
  const [taskToReject, setTaskToReject] = useState<{ childId: string; task: Task } | null>(null);
  const [rejectionComment, setRejectionComment] = useState('');
  const [profileSetupLink, setProfileSetupLink] = useState<string | null>(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [createProfileError, setCreateProfileError] = useState<string | null>(null);
  const [isUpdateGradesModalOpen, setIsUpdateGradesModalOpen] = useState(false);
  const [isCatalogManagerOpen, setIsCatalogManagerOpen] = useState(false);
  const [childForGrades, setChildForGrades] = useState<Child | null>(null);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [viewingChildId, setViewingChildId] = useState<string | null>(null);
  const [isSelectChildForGradesOpen, setIsSelectChildForGradesOpen] = useState(false);


  const effectiveRateMap = useMemo(() => {
    return buildRateMapFromGradeConfigs(gradeConfigs, DEFAULT_RATES);
  }, [gradeConfigs]);

  const childrenWithRateMap = useMemo(() => {
    // Filter profiles to get only children
    const childProfiles = familyAuth.profiles.filter(p => p.role === 'CHILD');

    return childProfiles.map((child) => {
      // 1. Resolve Rates: Prefer child's specific rates if they exist and aren't all zero (unless explicitly needed), 
      // otherwise fall back to global effectiveRateMap. 
      // The SettingsModal persists rates to the child profile, so we should trust `child.rates`.
      // However, we need to ensure we don't accidentally use empty default rates if they weren't set.
      // Logic: If child.rates has values > 0, use it. OR if we want to enforce the settings modal to be the source of truth,
      // we assume whatever is on the profile is correct.
      // For safety, let's use child.rates if available, else effectiveRateMap.

      const hasCustomRates = child.rates && Object.values(child.rates).some(r => r > 0);
      const ratesToUse = hasCustomRates ? child.rates : effectiveRateMap;

      // 2. Aggregate Tasks: Filter all tasks for this child
      const childTasks = tasks.filter(t => t.assigneeId === child.id);

      return {
        ...child,
        rates: ratesToUse,
        customTasks: childTasks,
        history: [],
      };
    });
  }, [familyAuth.profiles, effectiveRateMap, tasks]);

  const totalHouseholdNetWorth = useMemo(() => {
    return childrenWithRateMap.reduce((sum, child) => sum + (child.balanceCents || 0), 0);
  }, [childrenWithRateMap]);

  const hasChildren = childrenWithRateMap.length > 0;
  // Use isProfilesLoading instead of loadingChildren since we use familyAuth.profiles
  const isLoading = familyAuth.isProfilesLoading || loadingTasks;

  const pendingSetupCount = childrenWithRateMap.filter(
    (child) => (child.setupStatus ?? 'PROFILE_CREATED') !== 'SETUP_COMPLETE',
  ).length;
  const inviteSentCount = childrenWithRateMap.filter(
    (child) => (child.setupStatus ?? 'PROFILE_CREATED') === 'INVITE_SENT',
  ).length;

  const createChildMutation = useMutation({
    mutationFn: (child: Partial<Child>) => {
      if (!householdId) {
        return Promise.reject(new Error('No household selected.'));
      }
      return householdService.createChild(householdId, child);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['children'] }),
  });

  const createProfileMutation = useMutation({
    mutationFn: (payload: { name: string; pin?: string; avatarColor?: string }) => {
      if (!householdId) {
        return Promise.reject(new Error('No household selected.'));
      }
      return householdService.createProfile(householdId, payload);
    },
  });

  const deleteProfileMutation = useMutation({
    mutationFn: (profileId: string) => {
      if (!householdId) {
        return Promise.reject(new Error('No household selected.'));
      }
      return householdService.deleteProfileInHousehold(householdId, profileId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['children'] });
      queryClient.invalidateQueries({ queryKey: ['openTasks'] });
    },
  });

  const updateChildMutation = useMutation({
    mutationFn: (vars: { id: string; updates: Partial<Child> }) => {
      return householdService.updateChildById(vars.id, vars.updates);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['children'] }),
  });

  const resetChildPinMutation = useMutation({
    mutationFn: (vars: { profileId: string; newPin: string }) => {
      if (!householdId) {
        return Promise.reject(new Error('No household selected.'));
      }
      return householdService.adminResetChildPin({
        householdId,
        profileId: vars.profileId,
        newPin: vars.newPin,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['children'] }),
  });

  const assignTaskMutation = useMutation({
    mutationFn: (vars: {
      childId: string;
      task: Task;
      options?: { saveToCatalog?: boolean; catalogItemId?: string | null };
    }) => {
      if (!householdId) {
        return Promise.reject(new Error('No household selected.'));
      }

      return householdService.createTask(
        householdId,
        {
          ...vars.task,
          householdId,
          assigneeId: vars.childId,
          status: 'ASSIGNED',
        },
        vars.options,
      );
    },
    onSuccess: async (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['children'] });
      queryClient.invalidateQueries({ queryKey: ['openTasks'] });
      queryClient.invalidateQueries({ queryKey: ['choreCatalog'] });
      if (householdId) {
        await notificationService.notifyTaskAssigned({
          householdId,
          taskId: vars.task.id,
          targetProfileId: vars.childId,
        });
      }
    },
    onError: (error) => console.error('[assignTaskMutation] Failed to assign task:', error),
  });

  const createOpenTaskMutation = useMutation({
    mutationFn: (vars: { task: Task; options?: { saveToCatalog?: boolean; catalogItemId?: string | null } }) => {
      if (!householdId) {
        return Promise.reject(new Error('No household selected.'));
      }

      return householdService.createTask(
        householdId,
        {
          ...vars.task,
          householdId,
          status: 'OPEN',
          assigneeId: null,
        },
        vars.options,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['openTasks'] });
      queryClient.invalidateQueries({ queryKey: ['choreCatalog'] });
    },
    onError: (error) => console.error('[createOpenTaskMutation] Failed to create open task:', error),
  });

  const updateCatalogItemMutation = useMutation({
    mutationFn: (vars: { itemId: string; name: string; baselineMinutes: number }) => {
      if (!householdId) return Promise.reject(new Error('No household ID'));
      return householdService.updateChoreCatalogItem(householdId, vars.itemId, {
        name: vars.name,
        baselineMinutes: vars.baselineMinutes,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['choreCatalog'] }),
  });

  const deleteCatalogItemMutation = useMutation({
    mutationFn: (itemId: string) => {
      if (!householdId) return Promise.reject(new Error('No household ID'));
      return householdService.deleteChoreCatalogItem(householdId, itemId);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['choreCatalog'] }),
  });

  const statusTaskMutation = useMutation({
    mutationFn: (vars: { taskId: string; status: string; comment?: string; childId?: string }) => {
      return householdService.updateTaskById(
        vars.taskId,
        {
          status: vars.status as Task['status'],
          rejectionComment: typeof vars.comment === 'string' ? vars.comment : '',
        },
        vars.childId
      );
    },
    onSuccess: async (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['children'] });
      if (!householdId) {
        return;
      }
      if (vars.status === 'PENDING_APPROVAL') {
        await notificationService.notifyTaskPendingApproval({
          householdId,
          taskId: vars.taskId,
        });
      }
    },
  });

  const claimTaskMutation = useMutation({
    mutationFn: (vars: { childId: string; taskId: string }) => {
      return householdService.updateTaskById(vars.taskId, {
        assigneeId: vars.childId,
        status: 'ASSIGNED',
        rejectionComment: '',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['children'] });
      queryClient.invalidateQueries({ queryKey: ['openTasks'] });
    },
  });

  const payTaskMutation = useMutation({
    mutationFn: (vars: { childId: string; taskId: string; amountCents: number; memo: string }) => {
      if (!householdId) {
        return Promise.reject(new Error('No household selected.'));
      }
      return householdService.addEarning(
        vars.childId,
        vars.taskId,
        vars.amountCents,
        vars.memo,
        householdId,
      );
    },
    onSuccess: async (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['children'] });
      if (householdId) {
        await notificationService.notifyTaskPaid({
          householdId,
          taskId: vars.taskId,
          targetProfileId: vars.childId,
        });
      }
    },
  });

  const approveAndDepositMutation = useMutation({
    mutationFn: async (vars: { childId: string; task: Task; amountCents: number }) => {
      try {
        if (!householdId) {
          throw new Error('No household selected.');
        }

        const child = childrenWithRateMap.find(c => c.id === vars.childId);
        const childName = child?.name || 'Child';
        const balanceBefore = child?.balance || 0;
        const newBalance = balanceBefore + centsToDollars(vars.amountCents);

        console.log(`[APPROVE & DEPOSIT] TaskId: ${vars.task.id}, Amount: ${vars.amountCents}c, Child: ${childName}`);
        console.log(`[APPROVE & DEPOSIT] Balance Before: ${formatCurrency(balanceBefore)}, After: ${formatCurrency(newBalance)}`);

        return await householdService.addEarning(
          vars.childId,
          vars.task.id,
          vars.amountCents,
          `Completed: ${vars.task.name}`,
          householdId,
        );
      } catch (err: any) {
        console.error("[APPROVE & DEPOSIT ERROR]", err);
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['children'] });
      queryClient.invalidateQueries({ queryKey: ['openTasks'] });
    },
  });

  const addAdvanceMutation = useMutation({
    mutationFn: (vars: { childId: string; amountCents: number; memo: string; category: string }) => {
      if (!householdId) {
        return Promise.reject(new Error('No household selected.'));
      }
      return householdService.addAdvance(
        vars.childId,
        vars.amountCents,
        vars.memo,
        vars.category as 'Food/Drinks' | 'Entertainment' | 'Clothes' | 'School Supplies' | 'Toys/Games' | 'Other',
        householdId,
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['children'] }),
  });

  const handleCreateChild = (data: NewChildData) => {
    createChildMutation.mutate({
      ...data,
      subjects: data.subjects.map((subject) => ({ ...subject, id: crypto.randomUUID() })),
      rates: effectiveRateMap,
      currentHourlyRate: data.currentHourlyRate ?? 0,
      balanceCents: 0,
      balance: 0,
      history: [],
      customTasks: [],
    });
    setIsAddChildModalOpen(false);
  };

  const handleSaveGrades = (childId: string, updatedSubjects: Subject[], currentHourlyRate: number, updatedGlobalConfigs: GradeConfig[]) => {
    updateChildMutation.mutate({
      id: childId,
      updates: { subjects: updatedSubjects, currentHourlyRate }
    });

    // Persist the newly edited global payscale from the modal (not the stale fetched value)
    if (householdId && updatedGlobalConfigs.length > 0) {
      void householdService.saveGradeConfigs(householdId, updatedGlobalConfigs);
      queryClient.invalidateQueries({ queryKey: ['gradeConfigs', householdId] });
    }

    setIsUpdateGradesModalOpen(false);
    setChildForGrades(null);
  };

  const handleSaveTask = (payload: AssignTaskPayload) => {
    if (!householdId) {
      return;
    }

    const catalogItem =
      typeof payload.catalogItemId === 'string'
        ? choreCatalog.find((item) => item.id === payload.catalogItemId)
        : undefined;
    const name = catalogItem?.name ?? payload.taskName;
    const baselineMinutes = catalogItem?.baselineMinutes ?? payload.minutes;

    const task: Task = {
      // Reuse the existing task ID when editing so we overwrite the original
      // document rather than creating a duplicate. Only generate a new UUID
      // when this is a brand-new task creation.
      id: editingTask?.task.id ?? crypto.randomUUID(),
      householdId,
      name,
      baselineMinutes,
      status: 'OPEN',
      catalogItemId: catalogItem?.id ?? null,
      valueCents: payload.valueCents,
      multiplier: payload.multiplier,
    };

    const mutationOptions = {
      saveToCatalog: Boolean(payload.saveToCatalog && !catalogItem),
      catalogItemId: catalogItem?.id ?? null,
    };

    if (isOpenTaskMode) {
      createOpenTaskMutation.mutate({ task, options: mutationOptions });
    } else if (selectedChildId) {
      assignTaskMutation.mutate({
        childId: selectedChildId,
        task: { ...task, status: 'ASSIGNED' },
        options: mutationOptions,
      });
    }

    setIsAddTaskModalOpen(false);
  };

  const handlePayTask = async (childId: string, task: Task) => {
    const child = childrenWithRateMap.find((c) => c.id === childId);
    if (!child) return;

    const rate = calculateHourlyRate(child.subjects, child.rates);
    const earningsCents = calculateTaskValueCents(task.baselineMinutes, dollarsToCents(rate));

    await payTaskMutation.mutateAsync({
      childId,
      taskId: task.id,
      amountCents: earningsCents,
      memo: `Completed: ${task.name}`,
    });
  };

  const handleRejectTask = (childId: string, task: Task) => {
    setTaskToReject({ childId, task });
    setRejectionComment('');
  };

  const handleGenerateInvite = async () => {
    if (!childrenWithRateMap.length) {
      alert('Add at least one child profile before sending setup invites.');
      return;
    }
    setIsInviteModalOpen(true);
  };

  const handleGenerateProfileSetupLink = async (profile: Profile) => {
    if (!householdId) {
      return;
    }

    try {
      const link = await householdService.generateProfileSetupLink(householdId, profile.id);
      setProfileSetupLink(link);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : `Unable to generate setup link for ${profile.name}.`;
      alert(message);
    }
  };

  const toProfileFromChild = (child: Child): Profile => ({
    id: child.id,
    householdId: householdId ?? '',
    familyId: householdId ?? '',
    name: child.name,
    role: child.role,
    pinHash: undefined,
    avatarColor: undefined,
    gradeLevel: child.gradeLevel,
    subjects: child.subjects,
    rates: child.rates,
    currentHourlyRate: child.currentHourlyRate || 0,
    balance: child.balance,
    balanceCents: child.balanceCents,
    setupStatus: child.setupStatus,
    inviteLastSentAt: child.inviteLastSentAt,
    setupCompletedAt: child.setupCompletedAt,
  });

  const handleDeleteProfile = async (profile: Profile) => {
    if (!householdId || profile.role === 'ADMIN') {
      return;
    }

    const shouldDelete = window.confirm(`Delete ${profile.name}'s profile? This cannot be undone.`);
    if (!shouldDelete) {
      return;
    }

    try {
      await deleteProfileMutation.mutateAsync(profile.id);
      if (familyAuth.activeProfile?.id === profile.id) {
        familyAuth.clearActiveProfileSelection();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to delete profile right now.';
      alert(message);
    }
  };

  if (!isFirebaseConfigured) {
    return (
      <div className="min-h-screen bg-surface-app flex items-center justify-center text-content-primary p-6 transition-colors duration-300">
        <div className="max-w-lg w-full bg-white p-8 rounded-none border border-stroke-base text-center shadow-xl">
          <h2 className="text-2xl font-bold mb-4">Firebase Setup Required</h2>
          <p className="text-neutral-600 mb-2">Phase 2 requires Firebase Auth and Firestore configuration.</p>
          <p className="text-content-subtle text-sm">Add `VITE_FIREBASE_*` keys in `.env` and restart the app.</p>
        </div>
      </div>
    );
  }

  React.useEffect(() => {
    if (
      familyAuth.stage !== 'AUTHORIZED' ||
      !familyAuth.activeProfile?.id ||
      !familyAuth.householdId
    ) {
      return;
    }

    void notificationService.initializePushNotifications(
      familyAuth.householdId,
      familyAuth.activeProfile.id,
    );
  }, [familyAuth.stage, familyAuth.activeProfile?.id, familyAuth.householdId]);

  if (familyAuth.isInitializing) {
    return (
      <div className="min-h-screen bg-surface-app flex items-center justify-center text-content-primary">
        <Loader2 className="w-8 h-8 animate-spin text-crimson" />
      </div>
    );
  }

  if (familyAuth.stage === 'UNAUTHENTICATED') {
    return <Navigate to="/login" replace />;
  }

  if (familyAuth.stage === 'HOUSEHOLD_LOADED' || isLoading || !familyAuth.activeProfile) {
    return (
      <div className="min-h-screen bg-surface-app flex items-center justify-center text-content-primary">
        <Loader2 className="w-8 h-8 animate-spin text-crimson" />
      </div>
    );
  }

  if (familyAuth.stage === 'PROFILE_SELECTED') {
    const activeProfile = familyAuth.activeProfile;
    return (
      <PinModal
        isOpen={familyAuth.stage === 'PROFILE_SELECTED' && !!activeProfile}
        householdId={familyAuth.householdId}
        profileId={activeProfile?.id ?? null}
        profileRole={activeProfile?.role}
        mode={activeProfile?.pinHash ? 'VERIFY' : 'SETUP'}
        profileName={activeProfile?.name ?? 'Profile'}
        canAdminBypass={familyAuth.canManageProfiles}
        adminMasterPassword={appConfig.admin.masterPassword}
        onClose={familyAuth.clearActiveProfileSelection}
        onAuthorized={familyAuth.authorizeActiveProfile}
      />
    );
  }

  const activeProfile = familyAuth.activeProfile;

  if (activeProfile.role === 'CHILD') {
    const activeChild = childrenWithRateMap.find((child) => child.id === activeProfile.id);

    if (!activeChild) {
      return (
        <div className="min-h-screen bg-surface-app flex items-center justify-center text-content-primary">
          <div className="text-center">
            <p className="text-lg mb-4">Child profile data is still loading.</p>
            <button type="button" onClick={familyAuth.clearActiveProfileSelection} className="px-4 py-2 rounded-none bg-crimson text-white shadow-sm hover:bg-burgundy transition-colors">Back to Profile Picker</button>
          </div>
        </div>
      );
    }

    return (
      <ChildDashboard
        child={activeChild}
        availableTasks={openTasks}
        householdId={familyAuth.householdId!}
        onSubmitTask={(childId, task) => statusTaskMutation.mutate({ taskId: task.id, status: 'PENDING_APPROVAL', childId })}
        onClaimTask={(childId, taskId) => claimTaskMutation.mutate({ childId, taskId })}
        onSignOut={() => { void familyAuth.signOutUser(); }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-app text-primary relative pb-12 font-sans overflow-hidden transition-colors duration-300">
      {/* 1. Atmospheric Background Gradient (Ive Lens) */}
      <div
        className="absolute top-0 left-0 w-full h-[500px] pointer-events-none opacity-40 transition-opacity duration-1000"
        style={{
          background: 'linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-app) 50%, var(--bg-app) 100%)'
        }}
      />
      <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full blur-[120px] opacity-[0.03] pointer-events-none bg-crimson" />

      <div className="relative z-10 max-w-[1400px] mx-auto p-6 md:p-8">
        <header className="sticky top-0 z-50 flex justify-between items-center py-4 px-6 md:px-8 -mx-6 md:-mx-8 mb-10 bg-surface/80 dark:bg-app/80 backdrop-blur-md shadow-sm border-b border-border-base transition-colors duration-300">
          <div className="flex items-center gap-4">
            <img src="/images/HomeWorkAssets/homework-icon-new.svg" alt="HomeWork" className="h-8 w-auto" />
            <span className="text-xl font-serif text-charcoal dark:text-cream tracking-tight"><span className="font-normal">Home</span><span className="font-bold">Work</span></span>
            <div className="hidden md:flex flex-col relative group">
              {/* Glassmorphism Container for Net Worth */}
              <div className="absolute inset-0 bg-surface/40 dark:bg-white/5 backdrop-blur-md rounded-2xl -m-3 border border-border-base shadow-sm transition-all duration-300 group-hover:shadow-md" />

              <div className="relative">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted mb-1 block">Household Net Worth</span>
                <span className="text-2xl font-mono font-bold tracking-tighter text-primary">
                  <span className="text-lg opacity-30 mr-0.5">$</span>
                  {centsToDollars(totalHouseholdNetWorth).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Show Back Button if viewing a child detail */}
            {viewingChildId && (
              <Button
                variant="outline"
                onClick={() => setViewingChildId(null)}
                className="gap-2 border-border-base hover:bg-surface-2 dark:hover:bg-elev-1"
              >
                <ArrowRight className="w-4 h-4 rotate-180" /> Back to Dashboard
              </Button>
            )}

            <div className="relative">
              <Button
                variant="primary"
                className="rounded-full w-12 h-12 shadow-lg p-0 flex items-center justify-center"
                onClick={() => setIsActionMenuOpen(!isActionMenuOpen)}
              >
                <Plus className={`w-6 h-6 transition-transform duration-300 ${isActionMenuOpen ? 'rotate-45' : ''}`} />
              </Button>

              {isActionMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsActionMenuOpen(false)} />
                  <div className="absolute right-0 mt-3 w-56 bg-surface-base border border-border-base shadow-2xl z-[100] py-2 animate-in fade-in zoom-in-95 duration-200">
                    <button
                      onClick={() => { setIsActionMenuOpen(false); setIsAddChildModalOpen(true); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-content-primary hover:bg-brand hover:text-white dark:hover:bg-white/10 transition-colors group"
                    >
                      <UserPlus className="w-4 h-4 text-crimson group-hover:text-white transition-colors" />
                      Add Child
                    </button>
                    <button
                      onClick={() => { setIsActionMenuOpen(false); setIsOpenTaskMode(true); setIsAddTaskModalOpen(true); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-content-primary hover:bg-brand hover:text-white dark:hover:bg-white/10 transition-colors group"
                    >
                      <Calendar className="w-4 h-4 text-crimson group-hover:text-white transition-colors" />
                      Create Open Task
                    </button>
                    <button
                      onClick={() => { setIsActionMenuOpen(false); if (hasChildren) { setSelectedChildId(childrenWithRateMap[0].id); setIsAdvanceModalOpen(true); } }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-content-primary hover:bg-brand hover:text-white dark:hover:bg-white/10 transition-colors group"
                    >
                      <DollarSign className="w-4 h-4 text-crimson group-hover:text-white transition-colors" />
                      Add Advance
                    </button>
                    <div className="h-px bg-surface-2 my-1" />
                    <button
                      onClick={() => { setIsActionMenuOpen(false); setIsCatalogManagerOpen(true); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-content-primary hover:bg-brand hover:text-white dark:hover:bg-white/10 transition-colors group"
                    >
                      <Briefcase className="w-4 h-4 text-crimson group-hover:text-white transition-colors" />
                      Manage Chore Catalog
                    </button>
                    <button
                      onClick={() => { setIsActionMenuOpen(false); setIsSelectChildForGradesOpen(true); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-content-primary hover:bg-brand hover:text-white dark:hover:bg-white/10 transition-colors group"
                    >
                      <GraduationCap className="w-4 h-4 text-crimson group-hover:text-white transition-colors" />
                      Update Grades
                    </button>
                  </div>
                </>
              )}
            </div>

            <Button variant="ghost" onClick={() => { void familyAuth.signOutUser(); }} className="text-muted hover:text-primary border border-border-base rounded-full w-10 h-10 p-0 flex items-center justify-center">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </header>

        <div className="md:hidden mb-8 bg-surface dark:bg-elev-1 border border-border-base p-4 flex justify-between items-center transition-colors">
          <span className="text-xs font-bold uppercase tracking-wider text-muted">Household Net Worth</span>
          <span className="text-lg font-bold text-content-primary">{formatCurrency(centsToDollars(totalHouseholdNetWorth))}</span>
        </div>

        {taskStreamError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-none text-sm text-red-700 font-medium flex items-start gap-2">
            <span className="shrink-0 font-bold">⚠ Firebase Error:</span>
            <span>{taskStreamError}</span>
          </div>
        )}

        {hasChildren ? (
          <div className="mb-12">
            {viewingChildId ? (
              /* Detail View */
              (() => {
                const activeChild = childrenWithRateMap.find(c => c.id === viewingChildId);
                if (!activeChild) return <div>Child not found</div>;
                return (
                  <ChildDetail
                    child={activeChild}
                    isParent={true}
                    standardTasks={COMMON_TASKS}
                    availableTasks={openTasks}
                    onUpdateGrades={(candidate) => {
                      setChildForGrades(candidate);
                      setIsUpdateGradesModalOpen(true);
                    }}
                    onInviteChild={(candidate) => {
                      void handleGenerateProfileSetupLink(toProfileFromChild(candidate));
                    }}
                    onEditSettings={(candidate) => setChildToEdit(candidate)}
                    onAddAdvance={() => { setSelectedChildId(activeChild.id); setIsAdvanceModalOpen(true); }}
                    onSubmitTask={(childId, task) => statusTaskMutation.mutate({ taskId: task.id, status: 'PENDING_APPROVAL', childId })}
                    onApproveTask={(childId, task) => statusTaskMutation.mutate({ taskId: task.id, status: 'PENDING_PAYMENT', childId })}
                    onApproveAndDeposit={(childId, task, amountCents) => approveAndDepositMutation.mutateAsync({ childId, task, amountCents })}
                    onPayTask={handlePayTask}
                    onRejectTask={handleRejectTask}
                    onClaimTask={(childId, taskId) => claimTaskMutation.mutate({ childId, taskId })}
                  />
                );
              })()
            ) : (
              /* Dashboard View */
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
                <div className="xl:col-span-2 space-y-8">
                  {/* Children Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {childrenWithRateMap.map((child) => (
                      <ChildCard
                        key={child.id}
                        child={child}
                        siblings={childrenWithRateMap.filter((candidate) => candidate.id !== child.id)}
                        onClick={(c) => setViewingChildId(c.id)}
                        onEditSettings={(candidate) => setChildToEdit(candidate)}
                        onUpdateGrades={(candidate) => {
                          setChildForGrades(candidate);
                          setIsUpdateGradesModalOpen(true);
                        }}
                        onInviteChild={(candidate) => {
                          void handleGenerateProfileSetupLink(toProfileFromChild(candidate));
                        }}
                        onAssignTask={(candidate) => { setSelectedChildId(candidate.id); setIsAddTaskModalOpen(true); }}
                        onDeleteTask={(childId, taskId) => {
                          householdService
                            .deleteTaskById(taskId, childId)
                            .then(() => queryClient.invalidateQueries({ queryKey: ['children'] }))
                            .catch((err: unknown) => console.error('[onDeleteTask] Failed to delete task:', err));
                        }}
                        onEditTask={(task) => { setEditingTask({ childId: child.id, task }); setIsAddTaskModalOpen(true); }}
                        onReassignTask={() => undefined}
                        onApproveTask={(childId, task) => statusTaskMutation.mutate({ taskId: task.id, status: 'PENDING_PAYMENT', childId })}
                        onRejectTask={handleRejectTask}
                        onPayTask={handlePayTask}
                        onUndoApproval={(childId, taskId) => statusTaskMutation.mutate({ taskId, status: 'PENDING_APPROVAL', childId })}
                      />
                    ))}
                    <div className="flex min-h-[200px] items-center justify-center rounded-none border-2 border-dashed border-border-base bg-surface/50 dark:bg-white/5 p-6 hover:border-crimson/50 hover:bg-surface-2 dark:hover:bg-white/10 transition-all cursor-pointer group" onClick={() => setIsAddChildModalOpen(true)}>
                      <div className="text-center group-hover:scale-105 transition-transform duration-200">
                        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface-base dark:bg-elev-1 shadow-sm ring-1 ring-border-base group-hover:ring-crimson/20">
                          <Plus className="h-6 w-6 text-muted group-hover:text-crimson" />
                        </div>
                        <h3 className="text-sm font-bold text-primary">Add Child Profile</h3>
                        <p className="mt-1 text-xs text-muted">Track chores & allowance</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="xl:col-span-1 space-y-8">
                  {/* Open Tasks Column */}
                  <div className="bg-white dark:bg-[#1A1A24] border border-border-base p-6 rounded-2xl shadow-lg relative">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold font-heading text-primary flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-semantic-success animate-pulse"></span>
                          Bounty Board
                        </h3>
                        <span className="px-2 py-0.5 bg-surface-2 dark:bg-white/5 text-muted text-xs font-bold rounded-full border border-border-base">
                          {openTasks.length} Active
                        </span>
                      </div>
                      <button
                        onClick={() => { setIsOpenTaskMode(true); setIsAddTaskModalOpen(true); }}
                        className="text-sm font-bold text-crimson hover:text-crimson/80 flex items-center gap-1 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Create Bounty
                      </button>
                    </div>

                    <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-neutral-200 scrollbar-track-transparent">
                      {!loadingTasks && openTasks.length === 0 ? (
                        <div className="p-8 border border-border-base border-dashed rounded-xl text-center bg-surface-app dark:bg-white/5">
                          <p className="text-primary font-bold mb-1">No open bounties</p>
                          <p className="text-muted text-sm pb-2">Create tasks that any child can claim.</p>
                        </div>
                      ) : (
                        openTasks.map(task => (
                          <OpenTaskCard
                            key={task.id}
                            task={task}
                            children={childrenWithRateMap}
                            onEdit={(t) => {
                              setEditingTask({ childId: '', task: t });
                              setIsOpenTaskMode(true);
                              setIsAddTaskModalOpen(true);
                            }}
                            onDelete={(id) => statusTaskMutation.mutate({ taskId: id, status: 'DELETED' })}
                            onAssign={(taskId, childId) => {
                              if (!householdId) return;
                              const taskToAssign = openTasks.find(t => t.id === taskId);
                              if (taskToAssign) {
                                householdService
                                  .assignExistingTask(householdId, childId, taskToAssign)
                                  .then(() => {
                                    queryClient.invalidateQueries({ queryKey: ['children'] });
                                    queryClient.invalidateQueries({ queryKey: ['openTasks'] });
                                  })
                                  .catch((err: unknown) => console.error('[onAssign] Failed to assign existing task:', err));
                              }
                            }}
                          />
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <AdminSetupRail completedSteps={0} onStartAddChild={() => setIsAddChildModalOpen(true)} />
        )}

        <AddChildModal isOpen={isAddChildModalOpen} onClose={() => setIsAddChildModalOpen(false)} onAdd={handleCreateChild} />
        <UpdateGradesModal
          isOpen={isUpdateGradesModalOpen}
          onClose={() => {
            setIsUpdateGradesModalOpen(false);
            setChildForGrades(null);
          }}
          child={childForGrades}
          gradeConfigs={gradeConfigs}
          onSave={handleSaveGrades}
        />
        <SettingsModal
          isOpen={!!childToEdit}
          onClose={() => setChildToEdit(null)}
          child={childToEdit}
          onSave={(id, updates) => {
            updateChildMutation.mutate({ id, updates });
            setChildToEdit(null);
          }}
          onDelete={(childId) => {
            const child = childrenWithRateMap.find((candidate) => candidate.id === childId);
            if (!child || !householdId) {
              return;
            }
            void handleDeleteProfile({
              id: child.id,
              householdId,
              familyId: householdId,
              name: child.name,
              role: child.role,
              pinHash: undefined,
              avatarColor: undefined,
              gradeLevel: child.gradeLevel,
              subjects: child.subjects,
              rates: child.rates,
              currentHourlyRate: child.currentHourlyRate || 0,
              balance: child.balance,
              balanceCents: child.balanceCents,
            });
          }}
          onImportAll={() => undefined}
          onResetAll={() => undefined}
          onResetPin={async (childId, newPin) => {
            await resetChildPinMutation.mutateAsync({ profileId: childId, newPin });
          }}
        />
        <AssignTaskModal
          isOpen={isAddTaskModalOpen}
          onClose={() => { setIsAddTaskModalOpen(false); setEditingTask(null); }}
          childName={childrenWithRateMap.find((child) => child.id === (editingTask?.childId || selectedChildId))?.name}
          isOpenTask={isOpenTaskMode}
          catalogItems={choreCatalog}
          initialTask={editingTask ? { name: editingTask.task.name, minutes: editingTask.task.baselineMinutes } : undefined}
          onAssign={handleSaveTask}
        />
        <CatalogManagerModal
          isOpen={isCatalogManagerOpen}
          onClose={() => setIsCatalogManagerOpen(false)}
          items={choreCatalog}
          onUpdate={(itemId, name, baselineMinutes) => updateCatalogItemMutation.mutate({ itemId, name, baselineMinutes })}
          onDelete={(itemId) => deleteCatalogItemMutation.mutate(itemId)}
        />
        <AddAdvanceModal
          isOpen={isAdvanceModalOpen}
          onClose={() => setIsAdvanceModalOpen(false)}
          childrenData={childrenWithRateMap}
          initialChildId={selectedChildId}
          onAdd={(childId, amountCents, category, memo) => addAdvanceMutation.mutate({ childId, amountCents, category, memo })}
        />

        {taskToReject && (
          <Modal
            isOpen={true}
            onClose={() => setTaskToReject(null)}
            title="Reject Task"
          >
            <div className="space-y-6">
              <p className="text-sm text-content-subtle font-sans">
                Select a reason for rejecting <span className="font-bold text-content-primary">{taskToReject.task.name}</span>:
              </p>

              <div className="flex flex-wrap gap-2">
                {REJECTION_TAGS.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      const newComment = rejectionComment.includes(tag)
                        ? rejectionComment.split(', ').filter(t => t !== tag).join(', ')
                        : (rejectionComment ? `${rejectionComment}, ${tag}` : tag);
                      setRejectionComment(newComment);
                    }}
                    className={`px-4 py-2 text-xs font-bold uppercase tracking-widest border transition-all ${rejectionComment.includes(tag)
                      ? 'bg-brand text-white border-crimson shadow-md'
                      : 'bg-white text-content-subtle border-stroke-base hover:border-crimson hover:text-crimson'
                      }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-content-subtle">Additional Context</span>
                <textarea
                  value={rejectionComment}
                  onChange={(e) => setRejectionComment(e.target.value)}
                  placeholder="Optional notes..."
                  className="w-full min-h-[80px] p-4 bg-surface-app border border-stroke-base rounded-none text-sm font-sans focus:border-crimson outline-none transition-colors resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={() => {
                    statusTaskMutation.mutate({
                      childId: taskToReject.childId,
                      taskId: taskToReject.task.id,
                      status: 'ASSIGNED',
                      comment: rejectionComment || 'Task needs more work'
                    });
                    setTaskToReject(null);
                  }}
                >
                  Confirm Rejection
                </Button>
                <Button
                  variant="ghost"
                  className="flex-1 border border-stroke-base"
                  onClick={() => setTaskToReject(null)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {isSelectChildForGradesOpen && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsSelectChildForGradesOpen(false)} />
            <div className="relative w-full max-w-[560px] bg-surface-app dark:bg-surface-elev rounded-2xl border border-stroke-base p-8 text-left shadow-xl animate-in zoom-in-95 duration-200">
              <h3 className="text-xl font-bold mb-2 text-content-primary">Update Grades</h3>
              <p className="text-content-subtle mb-5 text-sm">Choose a child profile to update grades and payscale.</p>
              <div className="space-y-2 max-h-[320px] overflow-auto pr-1 custom-scrollbar">
                {childrenWithRateMap.map((child) => (
                  <button
                    key={child.id}
                    type="button"
                    onClick={() => {
                      setIsSelectChildForGradesOpen(false);
                      setChildForGrades(child);
                      setIsUpdateGradesModalOpen(true);
                    }}
                    className="w-full rounded-none border border-gold/20 bg-surface-app dark:bg-surface-2 px-4 py-3 text-left hover:border-crimson/30 hover:shadow-md transition-all group"
                  >
                    <div className="text-sm font-semibold text-content-primary group-hover:text-crimson">{child.name}</div>
                    <div className="text-xs text-content-subtle">{child.gradeLevel}</div>
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => setIsSelectChildForGradesOpen(false)} className="mt-5 w-full py-3 border border-gold/30 text-content-primary rounded-full font-bold transition-colors">Close</button>
            </div>
          </div>
        )}

        {isInviteModalOpen && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsInviteModalOpen(false)} />
            <div className="relative w-full max-w-[560px] bg-surface-app dark:bg-surface-elev rounded-2xl border border-stroke-base p-8 text-left shadow-xl animate-in zoom-in-95 duration-200">
              <h3 className="text-xl font-bold mb-2 text-content-primary">Invite Child Device</h3>
              <p className="text-content-subtle mb-5 text-sm">Choose a child profile to generate a unique setup URL.</p>
              <div className="space-y-2 max-h-[320px] overflow-auto pr-1 custom-scrollbar">
                {childrenWithRateMap.map((child) => (
                  <button
                    key={child.id}
                    type="button"
                    onClick={() => {
                      void handleGenerateProfileSetupLink(toProfileFromChild(child));
                      setIsInviteModalOpen(false);
                    }}
                    className="w-full rounded-none border border-stroke-base bg-surface-app px-4 py-3 text-left hover:bg-white hover:border-crimson/50 hover:shadow-md transition-all group"
                  >
                    <div className="text-sm font-semibold text-content-primary group-hover:text-crimson">{child.name}</div>
                    <div className="text-xs text-content-subtle">{child.gradeLevel}</div>
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => setIsInviteModalOpen(false)} className="mt-5 w-full py-3 bg-surface-2 rounded-none font-bold text-content-primary hover:bg-surface-2 transition-colors">Close</button>
            </div>
          </div>
        )}

        {profileSetupLink && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setProfileSetupLink(null)} />
            <div className="relative w-full max-w-[560px] bg-white rounded-none border border-stroke-base p-10 text-center shadow-xl animate-in zoom-in-95 duration-200">
              <h3 className="text-xl font-bold mb-4 text-content-primary">Profile Setup Link</h3>
              <p className="text-content-subtle mb-6 text-sm">Send this one-time link so the child can set their own PIN and avatar.</p>
              <div className="flex items-center gap-2 bg-surface-app p-3 rounded-none mb-6 border border-stroke-base">
                <code className="text-xs text-crimson flex-1 truncate font-mono">{profileSetupLink}</code>
                <button type="button" onClick={() => { void navigator.clipboard.writeText(profileSetupLink); }} className="text-xs font-bold bg-white border border-stroke-base px-3 py-1.5 rounded-none hover:bg-surface-app text-content-primary transition-colors shadow-sm">COPY</button>
              </div>
              <button type="button" onClick={() => setProfileSetupLink(null)} className="w-full py-3 bg-surface-2 rounded-none font-bold text-content-primary hover:bg-surface-2 transition-colors">Close</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SetupProfileRoute() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const householdIdFromLink = searchParams.get('householdId') ?? '';
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [householdId, setHouseholdId] = React.useState<string | null>(null);
  const [profileName, setProfileName] = React.useState('Profile');
  const [avatarColor, setAvatarColor] = React.useState('#ef4444');
  const [username, setUsername] = React.useState('');
  const [pin, setPin] = React.useState('');
  const [confirmPin, setConfirmPin] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isComplete, setIsComplete] = React.useState(false);
  const colorOptions = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];

  React.useEffect(() => {
    if (!id || !token) {
      setError('Setup link is invalid.');
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    void householdService
      .validateProfileSetupLink(id, token, householdIdFromLink)
      .then((result) => {
        if (!isMounted) {
          return;
        }
        setHouseholdId(result.householdId);
        setProfileName(result.profile.name);
        if (result.profile.avatarColor) {
          setAvatarColor(result.profile.avatarColor);
        }
        if (result.profile.loginUsername) {
          setUsername(result.profile.loginUsername);
        }
        setError(null);
      })
      .catch((validationError: unknown) => {
        if (!isMounted) {
          return;
        }
        setError(
          validationError instanceof Error ? validationError.message : 'Setup link could not be validated.',
        );
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [id, token, householdIdFromLink]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!id || !householdId) {
      setError('Setup link is invalid.');
      return;
    }
    if (!isValidChildUsername(username)) {
      setError('Username must be 3-24 characters and use letters, numbers, dot, dash, or underscore.');
      return;
    }
    if (!/^\d{4}$/.test(pin)) {
      setError('PIN must be exactly 4 digits.');
      return;
    }
    if (pin !== confirmPin) {
      setError('PINs do not match.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await householdService.completeProfileSetup({
        householdId,
        profileId: id,
        token,
        pin,
        avatarColor,
        username: normalizeChildUsername(username),
      });
      persistSession({
        householdId,
        familyId: householdId,
        profileId: id,
        role: 'CHILD',
      });
      setIsComplete(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to complete profile setup.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-app flex items-center justify-center p-6 transition-colors duration-300">
      <div className="w-full max-w-md rounded-none border border-stroke-base bg-white p-6 shadow-xl relative overflow-hidden">
        {/* Decorative background element */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

        {isLoading ? (
          <div className="flex items-center justify-center py-16 relative z-10">
            <Loader2 className="h-6 w-6 animate-spin text-crimson" />
          </div>
        ) : isComplete ? (
          <div className="text-center py-6 relative z-10">
            <div className="w-16 h-16 rounded-none bg-emerald-100 flex items-center justify-center mx-auto mb-4 text-emerald-600">
              <Check className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-content-primary font-heading">Setup Complete</h1>
            <p className="mt-3 text-sm text-content-subtle">Your profile is ready. Use Child Sign In with your username and PIN on any device.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-content-primary font-heading">Set Up {profileName}</h1>
              <p className="mt-2 text-sm text-content-subtle">Choose a username, avatar color, and create your 4-digit PIN.</p>
            </div>

            <div>
              <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-content-subtle">Avatar Color</span>
              <div className="flex gap-3 flex-wrap justify-center">
                {colorOptions.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setAvatarColor(color)}
                    className={`h-10 w-10 rounded-none border-2 transition-transform hover:scale-110 ${avatarColor === color ? 'border-neutral-900 ring-2 ring-neutral-900/20' : 'border-transparent hover:border-black/10'}`}
                    style={{ backgroundColor: color }}
                    aria-label={`Select avatar color ${color}`}
                  />
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="setup-username" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-content-subtle">Username</label>
              <Input
                id="setup-username"
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                maxLength={24}
                className="w-full px-4 py-3 rounded-none border border-stroke-base bg-white text-content-primary placeholder-neutral-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 transition-all font-sans"
                placeholder="emma_01"
                aria-label="Setup Username"
              />
            </div>

            <div>
              <label htmlFor="setup-pin" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-content-subtle">4-digit PIN</label>
              <Input
                id="setup-pin"
                type="password"
                value={pin}
                onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 4))}
                inputMode="numeric"
                maxLength={4}
                className="w-full px-4 py-3 rounded-none border border-stroke-base bg-white text-content-primary placeholder-neutral-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 transition-all font-mono tracking-widest text-center text-lg hidden-cursor"
                placeholder="0000"
                aria-label="Setup PIN"
              />
            </div>

            <div>
              <label htmlFor="setup-pin-confirm" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-content-subtle">Confirm PIN</label>
              <Input
                id="setup-pin-confirm"
                type="password"
                value={confirmPin}
                onChange={(event) => setConfirmPin(event.target.value.replace(/\D/g, '').slice(0, 4))}
                inputMode="numeric"
                maxLength={4}
                className="w-full px-4 py-3 rounded-none border border-stroke-base bg-white text-content-primary placeholder-neutral-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 transition-all font-mono tracking-widest text-center text-lg hidden-cursor"
                placeholder="0000"
                aria-label="Confirm setup PIN"
              />
            </div>

            {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-none border border-red-100 text-center font-medium">{error}</p>}

            <button
              type="submit"
              disabled={isSubmitting || !id || !householdId}
              className="w-full rounded-none bg-crimson px-4 py-3.5 text-base font-bold text-white hover:bg-burgundy disabled:opacity-60 shadow-md shadow-primary-700/20 transition-all hover:-translate-y-0.5"
            >
              {isSubmitting ? 'Saving...' : 'Finish Setup'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function useAuthPresence() {
  const [isResolved, setIsResolved] = React.useState(false);
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);

  React.useEffect(() => {
    if (!auth || !isFirebaseConfigured) {
      setIsResolved(true);
      setIsAuthenticated(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setIsAuthenticated(false);
        setIsResolved(true);
        return;
      }

      try {
        const linkedHousehold = await householdService.getCurrentHousehold(currentUser.uid);
        setIsAuthenticated(Boolean(linkedHousehold));
      } catch {
        setIsAuthenticated(false);
      } finally {
        setIsResolved(true);
      }
    });

    return unsubscribe;
  }, []);

  return { isResolved, isAuthenticated };
}

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { isResolved, isAuthenticated } = useAuthPresence();

  if (!isResolved) {
    return (
      <div className="min-h-screen bg-surface-app flex items-center justify-center text-content-primary">
        <Loader2 className="w-8 h-8 animate-spin text-crimson" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/admin-dashboard" replace />;
  }

  return <>{children}</>;
}

function LoginRoute() {
  const navigate = useNavigate();
  return <AuthScreen initialMode="LOGIN" onSuccess={() => navigate('/admin-dashboard', { replace: true })} />;
}

function SignupRoute() {
  const navigate = useNavigate();
  return (
    <AuthScreen
      initialMode="SIGNUP_CREATE"
      onSuccess={() => navigate('/admin-dashboard', { replace: true })}
    />
  );
}

function UnknownRouteHandler() {
  const location = useLocation();
  const { isResolved, isAuthenticated } = useAuthPresence();

  if (!isResolved) {
    return (
      <div className="min-h-screen bg-surface-app flex items-center justify-center text-content-primary">
        <Loader2 className="w-8 h-8 animate-spin text-crimson" />
      </div>
    );
  }

  if (location.pathname === '/dashboard') {
    return <Navigate to="/" replace />;
  }

  // Existing logic for other unknown routes
  if (isAuthenticated) {
    return <Navigate to="/admin-dashboard" replace />;
  }

  return <Navigate to="/" replace />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={(
              <PublicOnlyRoute>
                <LandingPage />
              </PublicOnlyRoute>
            )}
          />
          <Route
            path="/login"
            element={(
              <PublicOnlyRoute>
                <LoginRoute />
              </PublicOnlyRoute>
            )}
          />
          <Route
            path="/signup"
            element={(
              <PublicOnlyRoute>
                <SignupRoute />
              </PublicOnlyRoute>
            )}
          />
          <Route path="/setup-profile/:id" element={<SetupProfileRoute />} />
          <Route path="/admin-dashboard" element={<DashboardPage />} />
          <Route path="*" element={<UnknownRouteHandler />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
