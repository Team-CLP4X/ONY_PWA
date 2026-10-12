import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  deleteUser,
  onAuthStateChanged,
  type User,
  type Unsubscribe,
} from "firebase/auth";
import { auth } from "./config";
import { createUserProfileDoc, deleteUserData, syncRegisteredAccount } from "./firestore";

export interface OnyUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

export async function registerWithEmailPassword(
  email: string,
  pass: string,
  displayName: string,
  phoneNumber?: string,
): Promise<User> {
  const credential = await createUserWithEmailAndPassword(auth, email, pass);
  const user = credential.user;
  if (displayName.trim()) {
    await updateProfile(user, { displayName: displayName.trim() });
  }
  // Initialize initial user profile document in Firestore with emergency phone number
  await createUserProfileDoc(user.uid, {
    email: user.email || email,
    displayName: displayName.trim() || "Friend",
    phoneNumber: (phoneNumber || "").trim(),
  });
  return user;
}

export async function loginWithEmailPassword(email: string, pass: string): Promise<User> {
  const credential = await signInWithEmailAndPassword(auth, email, pass);
  const user = credential.user;
  await syncRegisteredAccount({
    uid: user.uid,
    displayName: user.displayName || email.split("@")[0] || "Friend",
    email: user.email || email,
  });
  return user;
}

export async function sendPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

export async function getCurrentIdToken(forceRefresh = false): Promise<string | null> {
  const current = auth.currentUser;
  if (!current) return null;
  return current.getIdToken(forceRefresh);
}

export async function deleteUserAccount(): Promise<void> {
  const current = auth.currentUser;
  if (!current) throw new Error("No user currently logged in.");
  const uid = current.uid;
  // Cleanup user's Firestore data before removing auth record
  await deleteUserData(uid);
  await deleteUser(current);
}

export function subscribeToAuthChanges(callback: (user: User | null) => void): Unsubscribe {
  return onAuthStateChanged(auth, callback);
}
