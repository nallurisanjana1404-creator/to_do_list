import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  browserLocalPersistence,
  setPersistence,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const baseConfig = firebaseConfig as Record<string, string>;
const app = initializeApp(baseConfig);
export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error('Failed to set auth persistence:', error);
});

export const provider = new GoogleAuthProvider();
// Request Calendar scopes
provider.addScope('https://www.googleapis.com/auth/calendar');
provider.addScope('https://www.googleapis.com/auth/calendar.events');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

// Initialize auth listener
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        try {
          const redirectResult = await getRedirectResult(auth);
          const credential = GoogleAuthProvider.credentialFromResult(redirectResult);
          cachedAccessToken = credential?.accessToken ?? null;
          if (cachedAccessToken && onAuthSuccess) {
            onAuthSuccess(user, cachedAccessToken);
          } else {
            cachedAccessToken = null;
            if (onAuthFailure) onAuthFailure();
          }
        } catch (error) {
          console.error('Redirect auth error:', error);
          cachedAccessToken = null;
          if (onAuthFailure) onAuthFailure();
        }
      }
    } else {
      try {
        const redirectResult = await getRedirectResult(auth);
        if (redirectResult?.user) {
          const credential = GoogleAuthProvider.credentialFromResult(redirectResult);
          cachedAccessToken = credential?.accessToken ?? null;
          if (cachedAccessToken && onAuthSuccess) {
            onAuthSuccess(redirectResult.user, cachedAccessToken);
          }
          return;
        }
      } catch (error) {
        console.error('Redirect auth error:', error);
      }

      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Sign in with Google using standard popup
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Google Auth.');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    if (
      error?.code === 'auth/popup-blocked' ||
      error?.code === 'auth/popup-closed-by-user' ||
      error?.code === 'auth/cancelled-popup-request'
    ) {
      await signInWithRedirect(auth, provider);
      return null;
    }

    console.error('Sign-in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};
