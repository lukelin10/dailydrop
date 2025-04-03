import { initializeApp, FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, Auth } from "firebase/auth";

// Safely access environment variables with fallbacks
const getEnvVar = (key: string): string => {
  const value = import.meta.env[key];
  if (!value && typeof window !== 'undefined') {
    console.warn(`Firebase config: ${key} is missing`);
  }
  return value || '';
};

const firebaseConfig = {
  apiKey: getEnvVar('VITE_FIREBASE_API_KEY'),
  authDomain: getEnvVar('VITE_FIREBASE_PROJECT_ID') 
    ? `${getEnvVar('VITE_FIREBASE_PROJECT_ID')}.firebaseapp.com` 
    : '',
  projectId: getEnvVar('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: getEnvVar('VITE_FIREBASE_PROJECT_ID')
    ? `${getEnvVar('VITE_FIREBASE_PROJECT_ID')}.appspot.com`
    : '',
  appId: getEnvVar('VITE_FIREBASE_APP_ID'),
};

console.log('Firebase Config:', {
  ...firebaseConfig,
  apiKey: firebaseConfig.apiKey ? '[PRESENT]' : '[MISSING]',
  authDomain: firebaseConfig.authDomain ? '[PRESENT]' : '[MISSING]',
  projectId: firebaseConfig.projectId ? '[PRESENT]' : '[MISSING]',
  storageBucket: firebaseConfig.storageBucket ? '[PRESENT]' : '[MISSING]',
  appId: firebaseConfig.appId ? '[PRESENT]' : '[MISSING]',
});

// Initialize Firebase with proper error handling
let firebaseApp: FirebaseApp | undefined;
let firebaseAuth: Auth | undefined;

// Check if we have minimum required config
const hasMinimumConfig = !!(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);

try {
  if (hasMinimumConfig) {
    firebaseApp = initializeApp(firebaseConfig);
    firebaseAuth = getAuth(firebaseApp);
    console.log("Firebase initialized successfully");
  } else {
    console.error('Firebase initialization failed: Missing required configuration');
  }
} catch (error) {
  console.error('Firebase initialization error:', error);
}

// Export the initialized Firebase instances
export const app = firebaseApp;
export const auth = firebaseAuth;

export async function signInWithGoogle() {
  // Guard against missing Firebase initialization
  if (!auth) {
    console.error("Cannot sign in with Google: Firebase auth is not initialized");
    throw new Error("Authentication service is not available. Please try again later.");
  }
  
  const provider = new GoogleAuthProvider();
  
  // Add additional scopes if needed
  provider.addScope('email');
  
  console.log("Firebase config check:", 
    firebaseConfig.apiKey ? "API key present" : "API key missing",
    firebaseConfig.authDomain ? "Auth domain present" : "Auth domain missing",
    firebaseConfig.projectId ? "Project ID present" : "Project ID missing"
  );
  
  try {
    console.log("Opening Google sign-in popup...");
    const result = await signInWithPopup(auth, provider);
    
    console.log("Google sign-in successful, user info:", {
      uid: result.user.uid ? "present" : "missing",
      email: result.user.email ? "present" : "missing",
      displayName: result.user.displayName ? "present" : "missing"
    });
    
    return result.user;
  } catch (error: any) {
    // Provide more detailed error information
    console.error("Error signing in with Google:", {
      code: error.code,
      message: error.message,
      email: error.email,
      credential: error.credential ? "present" : "missing"
    });
    
    // More user-friendly error message
    if (error.code === 'auth/popup-closed-by-user') {
      throw new Error("Sign-in was cancelled. Please try again.");
    } else if (error.code === 'auth/popup-blocked') {
      throw new Error("Sign-in popup was blocked. Please allow popups for this site.");
    } else if (error.code === 'auth/network-request-failed') {
      throw new Error("Network error. Please check your internet connection.");
    } else {
      throw error;
    }
  }
}