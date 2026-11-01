import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, doc, getDocFromServer, type Firestore } from "firebase/firestore";
import appConfig from "../../firebase-applet-config.json" with { type: "json" };

export interface FirebaseAppletConfig {
  projectId: string;
  appId: string;
  apiKey: string;
  authDomain: string;
  firestoreDatabaseId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
}

const firebaseConfig = {
  apiKey: appConfig.apiKey,
  authDomain: appConfig.authDomain,
  projectId: appConfig.projectId,
  storageBucket: appConfig.storageBucket,
  messagingSenderId: appConfig.messagingSenderId,
  appId: appConfig.appId,
};

const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth: Auth = getAuth(app);

import { setLogLevel } from "firebase/firestore";

try {
  setLogLevel("silent");
} catch {
  // Graceful no-op
}

const databaseId = appConfig.firestoreDatabaseId && appConfig.firestoreDatabaseId !== "(default)"
  ? appConfig.firestoreDatabaseId
  : undefined;

export const db: Firestore = databaseId ? getFirestore(app, databaseId) : getFirestore(app);

// Connectivity validation (browser only)
export async function validateFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.warn("[ONY Firebase] Offline or connection error:", error.message);
      return false;
    }
    // A permission-denied error is expected because of security rules, and confirms the server is reachable
    return true;
  }
}

if (typeof window !== "undefined") {
  validateFirestoreConnection().catch(() => {
    // Graceful no-op on initial boot
  });
}

export default app;
