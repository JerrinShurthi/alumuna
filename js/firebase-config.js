// =============================================================================
// Firebase Configuration and Initialization (Modular SDK v10)
// =============================================================================
// STEP 1: Replace the placeholders below with your actual Firebase project keys.
// You can get these from: Firebase Console -> Project Settings -> General -> Your apps -> Web app
// =============================================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// >>> INSERT YOUR FIREBASE CONFIGURATION HERE <<<
const firebaseConfig = {
  apiKey: "AIzaSyD6o2Dx0UZ0n1zRCky9EpbNtN_NZHgvaWQ",
  authDomain: "alumni-management-531df.firebaseapp.com",
  projectId: "alumni-management-531df",
  storageBucket: "alumni-management-531df.firebasestorage.app",
  messagingSenderId: "1027227897220",
  appId: "1:1027227897220:web:ec04ffe3ee0bbcc69921d1"
};
// >>> END OF FIREBASE CONFIGURATION <<<

/**
 * Checks if the user has replaced placeholder credentials.
 * @returns {boolean}
 */
export function isFirebaseConfigured() {
    return Boolean(
        firebaseConfig.apiKey &&
        firebaseConfig.apiKey !== "YOUR_API_KEY" &&
        firebaseConfig.projectId !== "YOUR_PROJECT_ID"
    );
}

// Initialize Firebase
let app;
let auth;
let db;
let storage;

try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
} catch (error) {
    console.error("Firebase initialization failed:", error);
}

export { app, auth, db, storage, firebaseConfig };
