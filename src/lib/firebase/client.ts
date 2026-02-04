import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import {
  getFirestore,
  initializeFirestore,
  type Firestore,
  type FirestoreSettings,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";

const parsedWebAppConfig = (() => {
  const raw = process.env.NEXT_PUBLIC_FIREBASE_WEBAPP_CONFIG;
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as Partial<{
      apiKey: string;
      authDomain: string;
      projectId: string;
      storageBucket: string;
      messagingSenderId: string;
      appId: string;
      measurementId: string;
    }>;
  } catch {
    return undefined;
  }
})();

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? parsedWebAppConfig?.apiKey,
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ??
    parsedWebAppConfig?.authDomain,
  projectId:
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ??
    parsedWebAppConfig?.projectId,
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ??
    parsedWebAppConfig?.storageBucket,
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ??
    parsedWebAppConfig?.messagingSenderId,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? parsedWebAppConfig?.appId,
  measurementId:
    process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ??
    parsedWebAppConfig?.measurementId,
};

const hasConfig = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.appId
);

const databaseId =
  process.env.NEXT_PUBLIC_FIRESTORE_DATABASE_ID || "ieadsm";

const app = hasConfig
  ? getApps().length
    ? getApp()
    : initializeApp(firebaseConfig)
  : null;

type FirebaseGlobal = typeof globalThis & {
  __ieadsm_firestore__?: Firestore | null;
  __ieadsm_auth__?: Auth | null;
  __ieadsm_storage__?: FirebaseStorage | null;
};

const firebaseGlobal = globalThis as FirebaseGlobal;

const buildFirestoreSettings = () => {
  const settings: FirestoreSettings = {
    ignoreUndefinedProperties: true,
    experimentalForceLongPolling: true,
  };
  if (typeof window !== "undefined") {
    settings.localCache = persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    });
  }
  return settings;
};

export const db = app
  ? (() => {
      if (firebaseGlobal.__ieadsm_firestore__ !== undefined) {
        return firebaseGlobal.__ieadsm_firestore__;
      }
      let instance: Firestore;
      try {
        instance = initializeFirestore(
          app,
          buildFirestoreSettings(),
          databaseId
        );
      } catch {
        instance = getFirestore(app, databaseId);
      }
      firebaseGlobal.__ieadsm_firestore__ = instance;
      return instance;
    })()
  : null;

export const auth = app
  ? (() => {
      if (firebaseGlobal.__ieadsm_auth__ !== undefined) {
        return firebaseGlobal.__ieadsm_auth__;
      }
      const instance = getAuth(app);
      firebaseGlobal.__ieadsm_auth__ = instance;
      return instance;
    })()
  : null;

export const storage = app
  ? (() => {
      if (firebaseGlobal.__ieadsm_storage__ !== undefined) {
        return firebaseGlobal.__ieadsm_storage__;
      }
      const instance = getStorage(app);
      firebaseGlobal.__ieadsm_storage__ = instance;
      return instance;
    })()
  : null;
