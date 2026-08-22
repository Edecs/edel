import { initializeApp, getApp, getApps } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
} from "firebase/auth";

const SECONDARY_NAME = "Secondary";

/**
 * Creates an Auth user without replacing the current admin session.
 * (Avoids prompt + sign-out/sign-in dance.)
 */
export async function createAuthUserWithoutSessionSwap(
  firebaseConfig,
  { email, password, displayName }
) {
  const app = getApps().some((a) => a.name === SECONDARY_NAME)
    ? getApp(SECONDARY_NAME)
    : initializeApp(firebaseConfig, SECONDARY_NAME);

  const secondaryAuth = getAuth(app);
  const { user } = await createUserWithEmailAndPassword(
    secondaryAuth,
    email,
    password
  );

  if (displayName) {
    try {
      await updateProfile(user, { displayName });
    } catch (_) {
      /* ignore */
    }
  }

  await signOut(secondaryAuth);
  return user;
}
