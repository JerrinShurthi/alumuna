// =============================================================================
// Firebase Authentication & Role Management Module
// =============================================================================

import { auth, db } from "./firebase-config.js";
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail,
    onAuthStateChanged,
    updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    doc,
    setDoc,
    getDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { showToast } from "./utils.js";

/**
 * Friendly error messages for Firebase Authentication
 * @param {string} code
 * @returns {string}
 */
export function getFriendlyAuthErrorMessage(code) {
    switch (code) {
        case "auth/invalid-email":
            return "Please enter a valid email address.";
        case "auth/user-disabled":
            return "This user account has been disabled.";
        case "auth/user-not-found":
            return "No registered account found with this email.";
        case "auth/wrong-password":
        case "auth/invalid-credential":
            return "Invalid email or password. Please try again.";
        case "auth/email-already-in-use":
            return "This email is already registered. Please login instead.";
        case "auth/weak-password":
            return "Password is too weak. Please use at least 6 characters.";
        case "auth/too-many-requests":
            return "Too many unsuccessful attempts. Please wait a few moments.";
        case "auth/network-request-failed":
            return "Network error. Please check your internet connection.";
        case "auth/api-key-not-valid":
            return "Invalid Firebase API key. Please configure js/firebase-config.js.";
        default:
            return "An authentication error occurred. Please try again.";
    }
}

/**
 * Register a new alumni user
 * Automatically assigns role: "alumni" in Firestore
 * @param {Object} data
 * @returns {Promise<{ user: Object, role: string }>}
 */
export async function registerUser(data) {
    const { email, password, ...profileFields } = data;

    // 1. Create account with Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update display name
    try {
        await updateProfile(user, { displayName: profileFields.name });
    } catch (err) {
        console.warn("Could not set displayName on auth user:", err);
    }

    const timestamp = new Date().toISOString();

    // 2. Store user record in users/{uid} with strictly "alumni" role
    const userDocRef = doc(db, "users", user.uid);
    await setDoc(userDocRef, {
        uid: user.uid,
        name: profileFields.name || "",
        email: email,
        role: "alumni", // Hardcoded security requirement: no normal user can be admin
        createdAt: timestamp
    });

    // 3. Store full profile in alumni/{uid}
    const alumniDocRef = doc(db, "alumni", user.uid);
    await setDoc(alumniDocRef, {
        uid: user.uid,
        name: profileFields.name || "",
        email: email,
        phone: profileFields.phone || "",
        gender: profileFields.gender || "",
        dob: profileFields.dob || "",
        graduationYear: profileFields.graduationYear || "",
        department: profileFields.department || "",
        degree: profileFields.degree || "",
        company: profileFields.company || "",
        jobPosition: profileFields.jobPosition || "",
        location: profileFields.location || "",
        linkedin: profileFields.linkedin || "",
        bio: profileFields.bio || "",
        profileImage: profileFields.profileImage || "assets/images/avatar-default.svg",
        createdAt: timestamp,
        updatedAt: timestamp
    });

    return { user, role: "alumni" };
}

/**
 * Login user and read Firestore role to redirect appropriately
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ user: Object, role: string }>}
 */
export async function loginUser(email, password) {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Fetch user document to check role from Firestore
    const userDocRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userDocRef);

    let role = "alumni";
    if (userSnap.exists()) {
        const userData = userSnap.data();
        role = userData.role || "alumni";
    } else {
        // Fallback: If user doc missing, initialize as alumni
        await setDoc(userDocRef, {
            uid: user.uid,
            name: user.displayName || "User",
            email: user.email,
            role: "alumni",
            createdAt: new Date().toISOString()
        });
    }

    return { user, role };
}

/**
 * Sign out current user and redirect
 * @param {string} [redirectUrl='login.html']
 */
export async function logoutUser(redirectUrl = "login.html") {
    try {
        await signOut(auth);
        sessionStorage.clear();
        window.location.href = redirectUrl;
    } catch (error) {
        console.error("Sign out error:", error);
        showToast("Error signing out. Please try again.", "error");
    }
}

/**
 * Send password reset email
 * @param {string} email
 */
export async function resetPassword(email) {
    await sendPasswordResetEmail(auth, email);
}

/**
 * Get the currently logged-in user from Auth
 * @returns {Object|null}
 */
export function getCurrentUser() {
    return auth.currentUser;
}

/**
 * Get user profile and role details from Firestore
 * @param {string} uid
 * @returns {Promise<{ user: Object|null, alumni: Object|null }>}
 */
export async function getUserProfile(uid) {
    if (!uid) return { user: null, alumni: null };
    try {
        const userRef = doc(db, "users", uid);
        const alumniRef = doc(db, "alumni", uid);

        const [userSnap, alumniSnap] = await Promise.all([
            getDoc(userRef),
            getDoc(alumniRef)
        ]);

        return {
            user: userSnap.exists() ? userSnap.data() : null,
            alumni: alumniSnap.exists() ? alumniSnap.data() : null
        };
    } catch (err) {
        console.error("Error fetching user profile:", err);
        return { user: null, alumni: null };
    }
}

/**
 * Check authentication state with role-based route guard
 * @param {Object} options
 * @param {'admin'|'alumni'|null} [options.requiredRole=null] - Role required to view page
 * @param {boolean} [options.allowAnonymous=true] - If false, redirects to login.html
 * @param {boolean} [options.redirectIfAuth=false] - For login/register pages; redirects if already logged in
 * @param {Function} [options.onUserReady] - Callback when user data is resolved
 */
export function checkAuthState({
    requiredRole = null,
    allowAnonymous = true,
    redirectIfAuth = false,
    onUserReady = null
} = {}) {
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            // Not logged in
            if (!allowAnonymous) {
                // Save current target if needed
                window.location.href = "login.html";
                return;
            }
            updatePublicNavbar(null, null);
            if (onUserReady) onUserReady(null, null);
            return;
        }

        // User is logged in -> verify role from Firestore
        try {
            const userRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userRef);
            let role = "alumni";
            let userData = null;

            if (userSnap.exists()) {
                userData = userSnap.data();
                role = userData.role || "alumni";
            }

            // Redirect if already authenticated and viewing login/register
            if (redirectIfAuth) {
                if (role === "admin") {
                    window.location.href = "admin-dashboard.html";
                } else {
                    window.location.href = "dashboard.html";
                }
                return;
            }

            // Route protection: admin page requested
            if (requiredRole === "admin" && role !== "admin") {
                showToast("Access denied. Admin privileges required.", "error");
                setTimeout(() => {
                    window.location.href = "dashboard.html";
                }, 1000);
                return;
            }

            // Route protection: alumni page requested by non-logged in (already handled)
            // Update UI elements
            updatePublicNavbar(user, role);
            if (onUserReady) onUserReady(user, role, userData);

        } catch (error) {
            console.error("Auth state role verification failed:", error);
            if (!allowAnonymous) {
                showToast("Authentication check failed. Please log in again.", "error");
                window.location.href = "login.html";
            }
        }
    });
}

/**
 * Update navbar dynamically based on logged in status on public pages
 * @param {Object|null} user
 * @param {string|null} role
 */
function updatePublicNavbar(user, role) {
    const authActions = document.getElementById("nav-auth-actions");
    if (!authActions) return;

    if (user) {
        const dashboardLink = role === "admin" ? "admin-dashboard.html" : "dashboard.html";
        const displayName = user.displayName || user.email.split("@")[0];

        authActions.innerHTML = `
            <div class="nav-user-dropdown">
                <a href="${dashboardLink}" class="nav-user-btn">
                    <span class="user-avatar-sm">${displayName.charAt(0).toUpperCase()}</span>
                    <span class="user-name-text">${displayName}</span>
                </a>
                <a href="${dashboardLink}" class="btn btn-outline-primary btn-sm">Dashboard</a>
                <button id="nav-logout-btn" class="btn btn-outline-danger btn-sm">Logout</button>
            </div>
        `;

        const logoutBtn = document.getElementById("nav-logout-btn");
        if (logoutBtn) {
            logoutBtn.addEventListener("click", () => logoutUser());
        }
    } else {
        authActions.innerHTML = `
            <a href="login.html" class="btn btn-outline-primary btn-sm">Login</a>
            <a href="register.html" class="btn btn-primary btn-sm">Register</a>
        `;
    }
}
