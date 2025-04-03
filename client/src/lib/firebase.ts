import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

console.log('Firebase Config:', {
  ...firebaseConfig,
  apiKey: firebaseConfig.apiKey ? '[PRESENT]' : '[MISSING]',
});

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

export async function signInWithGoogle() {
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