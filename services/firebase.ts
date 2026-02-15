import { FirebaseApp, FirebaseOptions, getApp, getApps, initializeApp } from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';
import { Messaging, getMessaging, isSupported } from 'firebase/messaging';
import { appConfig } from '@/services/config';

interface FirebaseServices {
  app: FirebaseApp | null;
  auth: Auth | null;
  db: Firestore | null;
  messaging: Messaging | null;
  isConfigured: boolean;
}

const rawFirebaseConfig: Partial<FirebaseOptions> = {
  apiKey: appConfig.firebase.apiKey,
  authDomain: appConfig.firebase.authDomain,
  projectId: appConfig.firebase.projectId,
  storageBucket: appConfig.firebase.storageBucket,
  messagingSenderId: appConfig.firebase.messagingSenderId,
  appId: appConfig.firebase.appId,
};

const requiredFirebaseConfigKeys: ReadonlyArray<keyof FirebaseOptions> = [
  'apiKey',
  'authDomain',
  'projectId',
  'appId',
  'messagingSenderId',
];

const isFirebaseConfigReady = requiredFirebaseConfigKeys.every((key) => {
  const value = rawFirebaseConfig[key];
  return typeof value === 'string' && value.trim().length > 0;
});

const createFirebaseServices = (): FirebaseServices => {
  if (!isFirebaseConfigReady) {
    console.warn('Firebase is not configured. Set VITE_FIREBASE_* environment variables to enable backend services.');
    return {
      app: null,
      auth: null,
      db: null,
      messaging: null,
      isConfigured: false,
    };
  }

  const app = getApps().length > 0 ? getApp() : initializeApp(rawFirebaseConfig as FirebaseOptions);
  const auth = getAuth(app);
  const db = getFirestore(app);

  return {
    app,
    auth,
    db,
    messaging: null,
    isConfigured: true,
  };
};

let singleton: FirebaseServices | null = null;

export const getFirebaseServices = (): FirebaseServices => {
  if (!singleton) {
    singleton = createFirebaseServices();
  }

  return singleton;
};

export const ensureFirebaseConfigured = (feature: string): void => {
  if (!getFirebaseServices().isConfigured) {
    throw new Error(`${feature} is unavailable because Firebase is not configured yet.`);
  }
};

const services = getFirebaseServices();

export const firebaseApp = services.app;
export const auth = services.auth;
export const db = services.db;
export const isFirebaseConfigured = services.isConfigured;

let messagingSingletonPromise: Promise<Messaging | null> | null = null;

export const getFirebaseMessaging = async (): Promise<Messaging | null> => {
  if (messagingSingletonPromise) {
    return messagingSingletonPromise;
  }

  messagingSingletonPromise = (async () => {
    const liveServices = getFirebaseServices();

    if (!liveServices.app || typeof window === 'undefined') {
      return null;
    }

    const messagingSupported = await isSupported();
    if (!messagingSupported) {
      return null;
    }

    if (!liveServices.messaging) {
      liveServices.messaging = getMessaging(liveServices.app);
    }

    return liveServices.messaging;
  })();

  return messagingSingletonPromise;
};
