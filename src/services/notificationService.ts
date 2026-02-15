import { arrayUnion, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getToken } from 'firebase/messaging';
import { appConfig } from '@/services/config';
import { db, getFirebaseMessaging } from '@/services/firebase';

type NotificationEventType = 'TASK_ASSIGNED' | 'TASK_PENDING_APPROVAL' | 'TASK_PAID';

interface EmitNotificationEventInput {
  householdId: string;
  taskId: string;
  targetProfileId?: string;
}

const tokenStore = new Set<string>();

const upsertProfileToken = async (
  householdId: string,
  profileId: string,
  token: string,
): Promise<void> => {
  if (!db) {
    return;
  }

  const profileRef = doc(db, `households/${householdId}/profiles/${profileId}`);
  await setDoc(
    profileRef,
    {
      fcmTokens: arrayUnion(token),
      fcmTokenUpdatedAt: serverTimestamp(),
    },
    { merge: true },
  );
};

const emitTaskNotificationEvent = async (
  type: NotificationEventType,
  input: EmitNotificationEventInput,
): Promise<void> => {
  if (!db || !input.householdId || !input.taskId) {
    return;
  }

  const eventRef = doc(db, `households/${input.householdId}/notification_events/${crypto.randomUUID()}`);
  await setDoc(eventRef, {
    type,
    householdId: input.householdId,
    taskId: input.taskId,
    targetProfileId: input.targetProfileId ?? null,
    createdAt: serverTimestamp(),
  });
};

export const notificationService = {
  async initializePushNotifications(householdId: string, profileId: string): Promise<void> {
    if (!householdId || !profileId || typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }

    if (!appConfig.firebase.vapidKey) {
      return;
    }

    const permissionResult = await Notification.requestPermission();
    if (permissionResult !== 'granted') {
      return;
    }

    const messaging = await getFirebaseMessaging();
    if (!messaging) {
      return;
    }

    const token = await getToken(messaging, { vapidKey: appConfig.firebase.vapidKey });
    if (!token || tokenStore.has(token)) {
      return;
    }

    await upsertProfileToken(householdId, profileId, token);
    tokenStore.add(token);
  },

  async notifyTaskAssigned(input: EmitNotificationEventInput): Promise<void> {
    await emitTaskNotificationEvent('TASK_ASSIGNED', input);
  },

  async notifyTaskPendingApproval(input: EmitNotificationEventInput): Promise<void> {
    await emitTaskNotificationEvent('TASK_PENDING_APPROVAL', input);
  },

  async notifyTaskPaid(input: EmitNotificationEventInput): Promise<void> {
    await emitTaskNotificationEvent('TASK_PAID', input);
  },
};
