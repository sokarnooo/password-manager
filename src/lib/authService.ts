import {
  auth,
  db,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  doc,
  getDoc,
  setDoc,
  User,
} from './firebase';
import { EncryptedVault } from '../types';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

/**
 * Sign in with Google Popup
 */
export async function loginWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

/**
 * Sign in with Email and Master Password
 */
export async function loginWithEmailAndMasterPassword(
  email: string,
  masterPassword: string
): Promise<User> {
  const result = await signInWithEmailAndPassword(auth, email, masterPassword);
  return result.user;
}

/**
 * Sign up with Email and Master Password
 */
export async function signupWithEmailAndMasterPassword(
  email: string,
  masterPassword: string
): Promise<User> {
  const result = await createUserWithEmailAndPassword(auth, email, masterPassword);
  return result.user;
}

/**
 * Sign out current user
 */
export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

/**
 * Save user's encrypted vault payload to Firestore
 */
export async function saveVaultToFirestore(
  uid: string,
  encryptedVault: EncryptedVault
): Promise<void> {
  try {
    const userDocRef = doc(db, 'users', uid);
    await setDoc(
      userDocRef,
      {
        encryptedVault,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error('Failed to sync vault to Firestore:', error);
  }
}

/**
 * Fetch user's encrypted vault payload from Firestore
 */
export async function fetchVaultFromFirestore(
  uid: string
): Promise<EncryptedVault | null> {
  try {
    const userDocRef = doc(db, 'users', uid);
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists() && docSnap.data().encryptedVault) {
      return docSnap.data().encryptedVault as EncryptedVault;
    }
  } catch (error) {
    console.error('Failed to fetch vault from Firestore:', error);
  }
  return null;
}
