import { auth } from '@/services/firebase';
import { householdService } from '@/services/householdService';
import { Child, ChoreCatalogItem, GradeConfig, Profile, Role, Task, Transaction } from '@/types';

const hashPin = async (pin: string): Promise<string> => {
  const safePin = pin.trim();
  if (safePin.length === 0) {
    throw new Error('PIN is required.');
  }

  const pinBytes = new TextEncoder().encode(safePin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', pinBytes);
  const hashArray = Array.from(new Uint8Array(hashBuffer));

  return hashArray.map((byte) => byte.toString(16).padStart(2, '0')).join('');
};

export interface DBProfile {
  id: string;
  householdId: string;
  family_id: string;
  name: string;
  pinHash?: string;
  pin_hash?: string;
  gradeLevel: string;
  balance: number;
  subjects: Child['subjects'];
  rates: Child['rates'];
  role: Role;
}

export const FamilyService = {
  async getCurrentFamily(): Promise<{ id: string; name: string } | null> {
    const userId = auth?.currentUser?.uid;
    const household = await householdService.getCurrentHousehold(userId);

    if (!household) {
      return null;
    }

    return {
      id: household.id,
      name: household.name,
    };
  },

  async getAdminProfile(householdId: string): Promise<Profile | null> {
    return householdService.getAdminProfile(householdId);
  },

  async generateInvite(householdId: string, role: 'ADMIN' | 'MEMBER' = 'MEMBER'): Promise<string> {
    return householdService.generateInvite(householdId, role);
  },

  async acceptInvite(token: string, name: string): Promise<DBProfile> {
    const profile = await householdService.acceptInvite(token, name, auth?.currentUser?.uid);

    return {
      id: profile.id,
      householdId: profile.householdId,
      family_id: profile.householdId,
      name: profile.name,
      pinHash: profile.pinHash,
      pin_hash: profile.pinHash,
      gradeLevel: profile.gradeLevel,
      balance: profile.balance,
      subjects: profile.subjects,
      rates: profile.rates,
      role: profile.role,
    };
  },

  async getOpenTasks(householdId: string): Promise<Task[]> {
    return householdService.getOpenTasks(householdId);
  },

  async getDraftTasks(householdId: string): Promise<Task[]> {
    return householdService.getDraftTasks(householdId);
  },

  async getChildren(householdId: string): Promise<Child[]> {
    return householdService.getChildren(householdId);
  },

  async createChild(householdId: string, child: Partial<Child>): Promise<Child> {
    const createdChild = await householdService.createChild(householdId, child);

    if (typeof child.pin === 'string' && child.pin.trim().length > 0) {
      const pinHash = await hashPin(child.pin);
      await householdService.setProfilePinHash(createdChild.id, pinHash);
      return {
        ...createdChild,
        pin: '****',
      };
    }

    return createdChild;
  },

  async createOpenTask(
    householdId: string,
    task: Task,
    options?: { saveToCatalog?: boolean; catalogItemId?: string | null },
  ): Promise<void> {
    await householdService.createTask(householdId, {
      ...task,
      householdId,
      status: 'OPEN',
      assigneeId: null,
    }, options);
  },

  async saveDraftTask(
    householdId: string,
    task: Task,
    options?: { saveToCatalog?: boolean; catalogItemId?: string | null },
  ): Promise<void> {
    await householdService.createTask(householdId, {
      ...task,
      householdId,
      status: 'DRAFT',
      assigneeId: task.assigneeId ?? null,
    }, options);
  },

  async verifyPin(childId: string, pin: string): Promise<boolean> {
    const pinHash = await hashPin(pin);
    return householdService.verifyProfilePinHash(childId, pinHash);
  },

  async assignTask(
    childId: string,
    task: Task,
    householdId: string,
    options?: { saveToCatalog?: boolean; catalogItemId?: string | null },
  ): Promise<void> {
    await householdService.createTask(householdId, {
      ...task,
      householdId,
      assigneeId: childId,
      status: 'ASSIGNED',
    }, options);
  },

  async claimTask(childId: string, taskId: string): Promise<void> {
    await householdService.updateTaskById(taskId, {
      assigneeId: childId,
      status: 'ASSIGNED',
      rejectionComment: '',
    });
  },

  async updateTaskStatus(taskId: string, status: string, comment?: string): Promise<void> {
    await householdService.updateTaskById(taskId, {
      status: status as Task['status'],
      rejectionComment: typeof comment === 'string' ? comment : '',
    });
  },

  async updateChild(childId: string, updates: Partial<Child>): Promise<void> {
    await householdService.updateChildById(childId, updates);
  },

  async payTask(
    householdId: string,
    childId: string,
    taskId: string,
    amountCents: number,
    memo: string,
  ): Promise<void> {
    await householdService.addEarning(childId, taskId, amountCents, memo, householdId);
  },

  async addAdvance(
    householdId: string,
    childId: string,
    amountCents: number,
    memo: string,
    category: string,
  ): Promise<void> {
    await householdService.addAdvance(childId, amountCents, memo, category, householdId);
  },

  async addManualAdjustment(
    householdId: string,
    childId: string,
    amountCents: number,
    memo: string,
  ): Promise<void> {
    await householdService.addManualAdjustment(childId, amountCents, memo, householdId);
  },

  async getGradeConfigs(householdId: string): Promise<GradeConfig[]> {
    return householdService.getGradeConfigs(householdId);
  },

  async getChoreCatalog(householdId: string): Promise<ChoreCatalogItem[]> {
    return householdService.getChoreCatalog(householdId);
  },

  async createFamilyForUser(userId: string, familyName: string, userName: string): Promise<{ family: { id: string; name: string }; profile: DBProfile }> {
    const { household, profile } = await householdService.createHouseholdForUser(userId, familyName, userName);

    return {
      family: {
        id: household.id,
        name: household.name,
      },
      profile: {
        id: profile.id,
        householdId: profile.householdId,
        family_id: profile.householdId,
        name: profile.name,
        pinHash: profile.pinHash,
        pin_hash: profile.pinHash,
        gradeLevel: profile.gradeLevel,
        balance: profile.balance,
        subjects: profile.subjects,
        rates: profile.rates,
        role: profile.role,
      },
    };
  },

  async setAdminPin(profileId: string, pin: string): Promise<void> {
    const pinHash = await hashPin(pin);
    await householdService.setProfilePinHash(profileId, pinHash);
  },

  async verifyAdminPin(profileId: string, pin: string): Promise<boolean> {
    const pinHash = await hashPin(pin);
    return householdService.verifyProfilePinHash(profileId, pinHash);
  },

  async getHouseholdActivity(householdId: string): Promise<Transaction[]> {
    return householdService.getHouseholdActivity(householdId, 10);
  },
};
