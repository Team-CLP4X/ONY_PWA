import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  updatePassword,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  EmailAuthProvider,
  GoogleAuthProvider,
  linkWithPopup,
  unlink,
  deleteUser,
  onAuthStateChanged,
  type User,
  type Unsubscribe,
} from "firebase/auth";
import { auth } from "./config";
import {
  createUserProfileDoc,
  deleteUserData,
  syncRegisteredAccount,
} from "./firestore";
import { deleteUserStorageFolder } from "./storage";

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

export async function loginWithGoogle(): Promise<User> {
  const provider = new GoogleAuthProvider();
  const credential = await signInWithPopupHelper(provider);
  const user = credential;
  await syncRegisteredAccount({
    uid: user.uid,
    displayName: user.displayName || user.email?.split("@")[0] || "Friend",
    email: user.email || "",
  });
  return user;
}

async function signInWithPopupHelper(provider: GoogleAuthProvider): Promise<User> {
  const { signInWithPopup } = await import("firebase/auth");
  const cred = await signInWithPopup(auth, provider);
  return cred.user;
}

export async function sendPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

export async function changeUserPassword(currentPassword: string, newPassword: string): Promise<void> {
  const current = auth.currentUser;
  if (!current || !current.email) {
    throw new Error("No password-enabled account is currently signed in.");
  }
  const hasPasswordProvider = current.providerData.some((p) => p.providerId === "password");
  if (!hasPasswordProvider) {
    throw new Error("This account uses Google sign-in and does not have an ONY email password to change.");
  }
  const cred = EmailAuthProvider.credential(current.email, currentPassword);
  await reauthenticateWithCredential(current, cred);
  await updatePassword(current, newPassword);
}

export async function reauthenticateForSensitiveAction(password?: string): Promise<void> {
  const current = auth.currentUser;
  if (!current) throw new Error("No user currently logged in.");
  const hasPasswordProvider = current.providerData.some((p) => p.providerId === "password");
  if (hasPasswordProvider && password && current.email) {
    const cred = EmailAuthProvider.credential(current.email, password);
    await reauthenticateWithCredential(current, cred);
    return;
  }
  await reauthenticateWithPopup(current, new GoogleAuthProvider());
}

export async function linkGoogleProvider(): Promise<User> {
  const current = auth.currentUser;
  if (!current) throw new Error("No user currently logged in.");
  const result = await linkWithPopup(current, new GoogleAuthProvider());
  return result.user;
}

export async function unlinkGoogleProvider(): Promise<User> {
  const current = auth.currentUser;
  if (!current) throw new Error("No user currently logged in.");
  if (current.providerData.length <= 1) {
    throw new Error("You must keep at least one sign-in method connected to your account.");
  }
  return unlink(current, "google.com");
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

export async function getCurrentIdToken(forceRefresh = false): Promise<string | null> {
  const current = auth.currentUser;
  if (!current) return null;
  return current.getIdToken(forceRefresh);
}

export async function deleteUserAccount(reauthPassword?: string): Promise<void> {
  const current = auth.currentUser;
  if (!current) throw new Error("No user currently logged in.");
  const uid = current.uid;
  if (reauthPassword) {
    await reauthenticateForSensitiveAction(reauthPassword);
  }
  await deleteUserStorageFolder(uid).catch(() => {});
  await deleteUserData(uid);
  await deleteUser(current);
}

export function subscribeToAuthChanges(callback: (user: User | null) => void): Unsubscribe {
  return onAuthStateChanged(auth, callback);
}
