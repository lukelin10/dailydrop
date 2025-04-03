import { initializeApp, FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, Auth } from "firebase/auth";

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

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

try {
  // Initialize Firebase with explicit error handling
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  
  // Log successful initialization for debugging
  console.log("Firebase initialized successfully");
} catch (error) {
  console.error("Firebase initialization error:", error);
  
  // Create fallbacks so the app doesn't crash
  app = null;
  auth = null;
}

// Simple exports with proper fallbacks
export { app, auth };

// Enhanced Google sign-in function with additional error handling
export async function signInWithGoogle() {
  // Verify auth is available before attempting sign-in
  if (!auth) {
    console.error("Firebase auth is not initialized");
    throw new Error("Authentication service unavailable");
  }
  
  try {
    const provider = new GoogleAuthProvider();
    
    // Only add scope if provider is properly initialized
    if (provider && typeof provider.addScope === 'function') {
      provider.addScope('email');
    }
    
    const result = await signInWithPopup(auth, provider);
    
    // Verify we have a valid user before returning
    if (result && result.user) {
      return result.user;
    } else {
      throw new Error("Sign-in successful but user data is missing");
    }
  } catch (error) {
    console.error("Google sign-in error:", error);
    throw error;
  }
}