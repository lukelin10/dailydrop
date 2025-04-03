import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

// Simple, direct Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_PROJECT_ID 
    ? `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com` 
    : "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_PROJECT_ID 
    ? `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.appspot.com` 
    : "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
};

// Basic Firebase initialization
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Simple exports
export { app, auth };

// Simplified Google sign-in function
export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.addScope('email');
  
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error("Google sign-in error:", error);
    throw error;
  }
}