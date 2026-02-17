import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { signOut, User, onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { Calendar, Loader2, LogOut, Plus, Share2, UserPlus, Users } from 'lucide-react';
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
import ChildCard from '@/components/ChildCard';
import ChildDetail from '@/components/ChildDetail';
import FamilyActivityFeed from '@/components/FamilyActivityFeed';
import SettingsModal from '@/components/SettingsModal';
import AuthScreen from '@/components/AuthScreen';
import AdminSetupRail from '@/components/AdminSetupRail';
import LandingScreen from '@/components/LandingScreen';
import MarketingLandingPage from '@/components/MarketingLandingPage';
import DashboardLandingPage from '@/components/DashboardLandingPage';
import PinModal from '@/components/PinModal';
import { auth, db, isFirebaseConfigured } from '@/services/firebase';
import { householdService } from '@/services/householdService';
import { notificationService } from '@/services/notificationService';
import { Child, Grade, GradeConfig, Profile, ProfileSetupStatus, Task } from '@/types';
import {
  buildRateMapFromGradeConfigs,
  calculateHourlyRate,
  calculateTaskValueCents,
  centsToDollars,
  dollarsToCents,
} from '@/utils';
import { isValidChildUsername, normalizeChildUsername } from '@/src/features/auth/childCredentials';
import { shouldBypassPinVerification } from '@/src/features/auth/sessionGate';

type FamilyAuthStage = 'UNAUTHENTICATED' | 'HOUSEHOLD_LOADED' | 'PROFILE_SELECTED' | 'AUTHORIZED';

interface PersistedSession {
  householdId?: string;
  familyId?: string;
  profileId?: string;
  role?: Profile['role'];
}

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
    balanceCents,
    balance: centsToDollars(balanceCents),
    setupStatus: parseProfileSetupStatus(source.setupStatus),
    inviteLastSentAt: parseOptionalIsoString(source.inviteLastSentAt),
    setupCompletedAt: parseOptionalIsoString(source.setupCompletedAt),
  };
};

function useFamilyAuth(): FamilyAuthState {
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

        if (canManageProfiles) {
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

  const { data: children = [], isLoading: loadingChildren } = useQuery({
    queryKey: ['children', householdId],
    queryFn: () => (householdId ? householdService.getChildren(householdId) : Promise.resolve([])),
    enabled: familyAuth.stage === 'AUTHORIZED' && !!householdId,
  });

  const { data: openTasks = [], isLoading: loadingOpenTasks } = useQuery({
    queryKey: ['openTasks', householdId],
    queryFn: () => (householdId ? householdService.getOpenTasks(householdId) : Promise.resolve([])),
    enabled: familyAuth.stage === 'AUTHORIZED' && !!householdId,
  });

  const { data: gradeConfigs = [] } = useQuery<GradeConfig[]>({
    queryKey: ['gradeConfigs', householdId],
    queryFn: () => (householdId ? householdService.getGradeConfigs(householdId) : Promise.resolve([])),
    enabled: familyAuth.stage === 'AUTHORIZED' && !!householdId,
  });

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

  const effectiveRateMap = useMemo(() => {
    return buildRateMapFromGradeConfigs(gradeConfigs, DEFAULT_RATES);
  }, [gradeConfigs]);

  const childrenWithRateMap = useMemo(() => {
    return children.map((child) => ({ ...child, rates: effectiveRateMap }));
  }, [children, effectiveRateMap]);

  const hasChildren = childrenWithRateMap.length > 0;
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
  });

  const saveDraftTaskMutation = useMutation({
    mutationFn: (vars: { task: Task; options?: { saveToCatalog?: boolean; catalogItemId?: string | null } }) => {
      if (!householdId) {
        return Promise.reject(new Error('No household selected.'));
      }

      return householdService.createTask(
        householdId,
        {
          ...vars.task,
          householdId,
          status: 'DRAFT',
          assigneeId: vars.task.assigneeId ?? null,
        },
        vars.options,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['children'] });
      queryClient.invalidateQueries({ queryKey: ['choreCatalog'] });
    },
  });

  const statusTaskMutation = useMutation({
    mutationFn: (vars: { taskId: string; status: string; comment?: string }) => {
      return householdService.updateTaskById(vars.taskId, {
        status: vars.status as Task['status'],
        rejectionComment: typeof vars.comment === 'string' ? vars.comment : '',
      });
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
      balanceCents: 0,
      balance: 0,
      history: [],
      customTasks: [],
    });
    setIsAddChildModalOpen(false);
  };

  const handleUpdateGrade = (childId: string, subjectId: string, newGrade: Grade) => {
    const child = childrenWithRateMap.find((candidate) => candidate.id === childId);
    if (!child) {
      return;
    }

    const updatedSubjects = child.subjects.map((subject) => {
      return subject.id === subjectId ? { ...subject, grade: newGrade } : subject;
    });

    updateChildMutation.mutate({ id: childId, updates: { subjects: updatedSubjects } });
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
      id: crypto.randomUUID(),
      householdId,
      name,
      baselineMinutes,
      status: 'OPEN',
      catalogItemId: catalogItem?.id ?? null,
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
    } else {
      saveDraftTaskMutation.mutate({
        task: { ...task, status: 'DRAFT', assigneeId: null },
        options: mutationOptions,
      });
    }

    setIsAddTaskModalOpen(false);
  };

  const handlePayTask = (childId: string, task: Task) => {
    const child = childrenWithRateMap.find((candidate) => candidate.id === childId);
    if (!child) {
      return;
    }

    const rate = calculateHourlyRate(child.subjects, child.rates);
    const earningsCents = calculateTaskValueCents(task.baselineMinutes, dollarsToCents(rate));
    payTaskMutation.mutate({
      childId,
      taskId: task.id,
      amountCents: earningsCents,
      memo: `Completed: ${task.name}`,
    });
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
      <div className="min-h-screen bg-black flex items-center justify-center text-white p-6">
        <div className="max-w-lg w-full bg-[#1a1a1a] p-8 rounded-2xl border border-white/10 text-center">
          <h2 className="text-2xl font-bold mb-4">Firebase Setup Required</h2>
          <p className="text-gray-400 mb-2">Phase 2 requires Firebase Auth and Firestore configuration.</p>
          <p className="text-gray-500 text-sm">Add `VITE_FIREBASE_*` keys in `.env` and restart the app.</p>
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
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-white/30" />
      </div>
    );
  }

  if (familyAuth.stage === 'UNAUTHENTICATED') {
    return <Navigate to="/login" replace />;
  }

  if (familyAuth.stage === 'HOUSEHOLD_LOADED' || familyAuth.stage === 'PROFILE_SELECTED') {
    const activeProfile = familyAuth.activeProfile;
    return (
      <>
        <LandingScreen
          profiles={familyAuth.profiles}
          isLoading={familyAuth.isProfilesLoading}
          selectedProfileId={activeProfile?.id ?? null}
          onSelectProfile={familyAuth.selectProfile}
          canAddProfile={familyAuth.canManageProfiles}
          isAdminUser={familyAuth.canManageProfiles}
          isCreatingProfile={createProfileMutation.isPending}
          createProfileError={createProfileError}
          profilesError={familyAuth.profilesError}
          onDeleteProfile={handleDeleteProfile}
          onGenerateSetupLink={handleGenerateProfileSetupLink}
          onCreateProfile={async ({ name, pin, avatarColor }) => {
            try {
              setCreateProfileError(null);
              const created = await createProfileMutation.mutateAsync({ name, pin, avatarColor });
              familyAuth.appendCreatedProfile(created);
            } catch (error) {
              const message =
                error instanceof Error ? error.message : 'Unable to create profile right now.';
              setCreateProfileError(message);
              throw error;
            }
          }}
          onSignOut={() => {
            void familyAuth.signOutUser();
          }}
        />
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
      </>
    );
  }

  if (loadingChildren || loadingOpenTasks || !familyAuth.activeProfile) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-white/30" />
      </div>
    );
  }

  const activeProfile = familyAuth.activeProfile;

  if (activeProfile.role === 'CHILD') {
    const activeChild = childrenWithRateMap.find((child) => child.id === activeProfile.id);

    if (!activeChild) {
      return (
        <div className="min-h-screen bg-black flex items-center justify-center text-white">
          <div className="text-center">
            <p className="text-lg mb-4">Child profile data is still loading.</p>
            <button type="button" onClick={familyAuth.clearActiveProfileSelection} className="px-4 py-2 rounded-lg bg-[#b30000] text-white">Back to Profile Picker</button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white relative pb-12">
        <div className="relative z-10 max-w-[1200px] mx-auto p-6 md:p-8">
          <header className="flex justify-between items-center mb-10">
            <div className="flex items-center gap-3">
              <span className="text-2xl font-[590] tracking-tight text-white">HomeWork</span>
              <span className="px-2 py-0.5 rounded-md bg-white/10 border border-white/5 text-[11px] font-bold tracking-wider text-gray-400 uppercase">Child</span>
            </div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => { void familyAuth.signOutUser(); }} className="w-11 h-11 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </header>

          <ChildDetail
            child={activeChild}
            isParent={false}
            standardTasks={COMMON_TASKS}
            availableTasks={openTasks}
            onUpdateGrade={handleUpdateGrade}
            onSubmitTask={(childId, task) => statusTaskMutation.mutate({ taskId: task.id, status: 'PENDING_APPROVAL' })}
            onApproveTask={() => undefined}
            onPayTask={handlePayTask}
            onRejectTask={() => undefined}
            onClaimTask={(childId, taskId) => claimTaskMutation.mutate({ childId, taskId })}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white relative pb-12">
      <div className="relative z-10 max-w-[1400px] mx-auto p-6 md:p-8">
        <header className="flex justify-between items-center mb-10">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-[590] tracking-tight text-white">HomeWork</span>
            <span className="px-2 py-0.5 rounded-md bg-white/10 border border-white/5 text-[11px] font-bold tracking-wider text-gray-400 uppercase">Admin</span>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={familyAuth.clearActiveProfileSelection} className="h-11 px-4 rounded-full bg-white/5 border border-white/10 flex items-center gap-2 text-gray-300 hover:text-white hover:bg-white/10">
              <Users className="w-4 h-4" />
              Profiles
            </button>
            <button type="button" onClick={() => { void familyAuth.signOutUser(); }} className="w-11 h-11 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        <div className="flex flex-wrap items-center gap-3 mb-8">
          <button type="button" onClick={() => setIsAddChildModalOpen(true)} className="bg-gradient-to-r from-[#b30000] to-[#7a0000] text-white font-medium px-6 py-3.5 rounded-xl flex items-center gap-2">
            <UserPlus className="w-[18px] h-[18px]" />
            <span className="hidden sm:inline">Add Child</span>
          </button>
          <button type="button" onClick={() => { setIsOpenTaskMode(true); setIsAddTaskModalOpen(true); }} disabled={!hasChildren} className="flex items-center gap-2 px-6 py-3.5 rounded-xl font-medium bg-white/5 text-white disabled:opacity-50">
            <Calendar className="w-[18px] h-[18px]" />
            <span className="hidden sm:inline">Add Open Task</span>
          </button>
          <button type="button" onClick={() => { setIsOpenTaskMode(false); setSelectedChildId(''); setIsAddTaskModalOpen(true); }} disabled={!hasChildren} className="flex items-center gap-2 px-6 py-3.5 rounded-xl font-medium bg-white/5 text-white disabled:opacity-50">
            <Calendar className="w-[18px] h-[18px]" />
            <span className="hidden sm:inline">Create Draft</span>
          </button>
          <button type="button" onClick={() => { if (hasChildren) { setSelectedChildId(childrenWithRateMap[0].id); setIsAdvanceModalOpen(true); } }} disabled={!hasChildren} className="flex items-center gap-2 px-6 py-3.5 rounded-xl font-medium bg-white/5 text-white disabled:opacity-50">
            <Plus className="w-[18px] h-[18px]" />
            <span className="hidden sm:inline">Add Advance</span>
          </button>
          <button type="button" onClick={handleGenerateInvite} className="h-11 px-4 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all gap-2 border-dashed">
            <Share2 className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Invite</span>
          </button>
        </div>

        {hasChildren ? (
          <div className="mb-12">
            <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-white">Family command center is active.</p>
                <p className="text-xs text-gray-400">
                  {pendingSetupCount} profile{pendingSetupCount === 1 ? '' : 's'} awaiting setup completion.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-semibold text-gray-300">
                  Invite Sent: {inviteSentCount}
                </span>
                <button
                  type="button"
                  onClick={() => setIsAddChildModalOpen(true)}
                  className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10"
                >
                  Add Another Child
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="col-span-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {childrenWithRateMap.map((child) => (
                    <ChildCard
                      key={child.id}
                      child={child}
                      siblings={childrenWithRateMap.filter((candidate) => candidate.id !== child.id)}
                      onEditSettings={(candidate) => setChildToEdit(candidate)}
                      onUpdateGrades={(candidate) => setChildToEdit(candidate)}
                      onInviteChild={(candidate) => {
                        void handleGenerateProfileSetupLink(toProfileFromChild(candidate));
                      }}
                      onAssignTask={(candidate) => { setSelectedChildId(candidate.id); setIsAddTaskModalOpen(true); }}
                      onDeleteTask={(childId, taskId) => statusTaskMutation.mutate({ taskId, status: 'DELETED' })}
                      onEditTask={(task) => { setEditingTask({ childId: child.id, task }); setIsAddTaskModalOpen(true); }}
                      onReassignTask={() => undefined}
                      onApproveTask={(childId, task) => statusTaskMutation.mutate({ taskId: task.id, status: 'PENDING_PAYMENT' })}
                      onRejectTask={(childId, task) => { setTaskToReject({ childId, task }); setRejectionComment(''); }}
                      onPayTask={handlePayTask}
                      onUndoApproval={(childId, taskId) => statusTaskMutation.mutate({ taskId, status: 'PENDING_APPROVAL' })}
                    />
                  ))}
                </div>
              </div>
              <div className="col-span-1">
                <FamilyActivityFeed familyId={householdId!} />
              </div>
            </div>
          </div>
        ) : (
          <AdminSetupRail completedSteps={0} onStartAddChild={() => setIsAddChildModalOpen(true)} />
        )}

        <AddChildModal isOpen={isAddChildModalOpen} onClose={() => setIsAddChildModalOpen(false)} onAdd={handleCreateChild} />
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
        <AddAdvanceModal
          isOpen={isAdvanceModalOpen}
          onClose={() => setIsAdvanceModalOpen(false)}
          childrenData={childrenWithRateMap}
          initialChildId={selectedChildId}
          onAdd={(childId, amountCents, category, memo) => addAdvanceMutation.mutate({ childId, amountCents, category, memo })}
        />

        {taskToReject && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setTaskToReject(null)} />
            <div className="relative w-full max-w-[480px] bg-[#1a1a1a] rounded-[24px] border border-white/[0.06] p-10">
              <h3 className="text-xl font-bold mb-4">Reject Task: {taskToReject.task.name}</h3>
              <textarea value={rejectionComment} onChange={(event) => setRejectionComment(event.target.value)} placeholder="What needs to be fixed?" className="w-full min-h-[120px] p-4 bg-white/5 border border-white/10 rounded-xl mb-6 outline-none focus:border-red-500" autoFocus />
              <div className="flex gap-4">
                <button type="button" onClick={() => setTaskToReject(null)} className="flex-1 py-3 text-gray-400 bg-white/5 rounded-xl">Cancel</button>
                <button type="button" onClick={() => {
                  if (!taskToReject || rejectionComment.trim().length === 0) {
                    return;
                  }
                  statusTaskMutation.mutate({ taskId: taskToReject.task.id, status: 'ASSIGNED', comment: rejectionComment });
                  setTaskToReject(null);
                  setRejectionComment('');
                }} disabled={rejectionComment.trim().length === 0} className="flex-1 py-3 bg-red-600 rounded-xl font-bold disabled:opacity-50">
                  Send Back
                </button>
              </div>
            </div>
          </div>
        )}

        {isInviteModalOpen && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsInviteModalOpen(false)} />
            <div className="relative w-full max-w-[560px] bg-[#1a1a1a] rounded-[24px] border border-white/[0.06] p-8 text-left">
              <h3 className="text-xl font-bold mb-2">Invite Child Device</h3>
              <p className="text-gray-400 mb-5 text-sm">Choose a child profile to generate a unique setup URL.</p>
              <div className="space-y-2 max-h-[320px] overflow-auto pr-1">
                {childrenWithRateMap.map((child) => (
                  <button
                    key={child.id}
                    type="button"
                    onClick={() => {
                      void handleGenerateProfileSetupLink(toProfileFromChild(child));
                      setIsInviteModalOpen(false);
                    }}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left hover:bg-white/10"
                  >
                    <div className="text-sm font-semibold text-white">{child.name}</div>
                    <div className="text-xs text-gray-400">{child.gradeLevel}</div>
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => setIsInviteModalOpen(false)} className="mt-5 w-full py-3 bg-white/10 rounded-xl font-bold hover:bg-white/15">Close</button>
            </div>
          </div>
        )}

        {profileSetupLink && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setProfileSetupLink(null)} />
            <div className="relative w-full max-w-[560px] bg-[#1a1a1a] rounded-[24px] border border-white/[0.06] p-10 text-center">
              <h3 className="text-xl font-bold mb-4">Profile Setup Link</h3>
              <p className="text-gray-400 mb-6 text-sm">Send this one-time link so the child can set their own PIN and avatar.</p>
              <div className="flex items-center gap-2 bg-white/5 p-3 rounded-xl mb-6 border border-white/10">
                <code className="text-xs text-[#ffb3b3] flex-1 truncate">{profileSetupLink}</code>
                <button type="button" onClick={() => { void navigator.clipboard.writeText(profileSetupLink); }} className="text-xs font-bold bg-white/10 px-3 py-1.5 rounded-lg hover:bg-white/20">COPY</button>
              </div>
              <button type="button" onClick={() => setProfileSetupLink(null)} className="w-full py-3 bg-white/10 rounded-xl font-bold hover:bg-white/15">Close</button>
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
    <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#171717] p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-[#b30000]" />
          </div>
        ) : isComplete ? (
          <div className="text-center py-6">
            <h1 className="text-2xl font-semibold">Setup Complete</h1>
            <p className="mt-3 text-sm text-gray-400">Your profile is ready. Use Child Sign In with your username and PIN on any device.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <h1 className="text-2xl font-semibold">Set Up {profileName}</h1>
              <p className="mt-2 text-sm text-gray-400">Choose a username, avatar color, and create your 4-digit PIN.</p>
            </div>

            <div>
              <span className="mb-2 block text-xs uppercase tracking-wide text-gray-400">Avatar Color</span>
              <div className="flex gap-2 flex-wrap">
                {colorOptions.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setAvatarColor(color)}
                    className={`h-9 w-9 rounded-full border ${avatarColor === color ? 'border-white' : 'border-white/20'}`}
                    style={{ backgroundColor: color }}
                    aria-label={`Select avatar color ${color}`}
                  />
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="setup-username" className="mb-1 block text-xs uppercase tracking-wide text-gray-400">Username</label>
              <input
                id="setup-username"
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                maxLength={24}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none placeholder:text-gray-500 focus:border-[#b30000]/60"
                placeholder="emma_01"
                aria-label="Setup Username"
              />
            </div>

            <div>
              <label htmlFor="setup-pin" className="mb-1 block text-xs uppercase tracking-wide text-gray-400">4-digit PIN</label>
              <input
                id="setup-pin"
                type="password"
                value={pin}
                onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 4))}
                inputMode="numeric"
                maxLength={4}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none placeholder:text-gray-500 focus:border-[#b30000]/60"
                placeholder="0000"
                aria-label="Setup PIN"
              />
            </div>

            <div>
              <label htmlFor="setup-pin-confirm" className="mb-1 block text-xs uppercase tracking-wide text-gray-400">Confirm PIN</label>
              <input
                id="setup-pin-confirm"
                type="password"
                value={confirmPin}
                onChange={(event) => setConfirmPin(event.target.value.replace(/\D/g, '').slice(0, 4))}
                inputMode="numeric"
                maxLength={4}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none placeholder:text-gray-500 focus:border-[#b30000]/60"
                placeholder="0000"
                aria-label="Confirm setup PIN"
              />
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={isSubmitting || !id || !householdId}
              className="w-full rounded-xl bg-[#b30000] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#980000] disabled:opacity-60"
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
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-white/30" />
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
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-white/30" />
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
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={(
            <PublicOnlyRoute>
              <MarketingLandingPage />
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
  );
}
