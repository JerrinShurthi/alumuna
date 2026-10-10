// =============================================================================
// Alumni Profile View & Update Controller
// =============================================================================

import { checkAuthState, getUserProfile, logoutUser } from "./auth.js";
import { showToast, setButtonLoading, escapeHtml } from "./utils.js";
import { db, storage } from "./firebase-config.js";
import { doc, updateDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

let currentAuthUser = null;
let currentProfileData = null;

document.addEventListener("DOMContentLoaded", () => {
    // Route guard: user must be logged in
    checkAuthState({
        allowAnonymous: false,
        onUserReady: async (user) => {
            currentAuthUser = user;
            await loadProfileData(user.uid);
            setupEditModal();
        }
    });

    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => logoutUser());
    }
});

async function loadProfileData(uid) {
    const profile = await getUserProfile(uid);
    currentProfileData = profile.alumni || {
        name: currentAuthUser.displayName || "Alumni Member",
        email: currentAuthUser.email,
        profileImage: "assets/images/avatar-default.svg"
    };

    renderProfileView(currentProfileData);
}

function renderProfileView(p) {
    // Header block
    const avatarEl = document.getElementById("profile-avatar-display");
    const nameEl = document.getElementById("profile-name-display");
    const headlineEl = document.getElementById("profile-headline-display");
    const locationEl = document.getElementById("profile-location-display");
    const linkedinBtn = document.getElementById("profile-linkedin-link");

    if (avatarEl) avatarEl.src = p.profileImage || "assets/images/avatar-default.svg";
    if (nameEl) nameEl.textContent = p.name || "N/A";
    
    if (headlineEl) {
        const title = p.jobPosition ? `${p.jobPosition}` : "";
        const comp = p.company ? ` at ${p.company}` : "";
        headlineEl.textContent = (title || comp) ? `${title}${comp}` : (p.department || "Alumni");
    }

    if (locationEl) {
        locationEl.textContent = p.location ? `📍 ${p.location}` : "📍 Location not specified";
    }

    if (linkedinBtn) {
        if (p.linkedin && p.linkedin.trim() !== "") {
            linkedinBtn.href = p.linkedin.startsWith("http") ? p.linkedin : `https://${p.linkedin}`;
            linkedinBtn.style.display = "inline-flex";
        } else {
            linkedinBtn.style.display = "none";
        }
    }

    // Detail Fields
    setText("view-email", p.email || currentAuthUser.email);
    setText("view-phone", p.phone || "Not specified");
    setText("view-gender", p.gender || "Not specified");
    setText("view-dob", p.dob || "Not specified");
    setText("view-grad-year", p.graduationYear || "Not specified");
    setText("view-department", p.department || "Not specified");
    setText("view-degree", p.degree || "Not specified");
    setText("view-company", p.company || "Not specified");
    setText("view-position", p.jobPosition || "Not specified");
    setText("view-location", p.location || "Not specified");
    setText("view-bio", p.bio || "No biography provided yet.");
}

function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function setupEditModal() {
    const editModal = document.getElementById("edit-profile-modal");
    const openBtn = document.getElementById("open-edit-modal-btn");
    const closeBtn = document.getElementById("close-edit-modal");
    const cancelBtn = document.getElementById("cancel-edit-modal");
    const form = document.getElementById("edit-profile-form");
    const saveBtn = document.getElementById("save-profile-btn");
    const imageInput = document.getElementById("edit-avatar-input");
    const imagePreview = document.getElementById("edit-avatar-preview");

    if (!editModal || !form) return;

    // Open Modal and populate current values
    if (openBtn) {
        openBtn.addEventListener("click", () => {
            const p = currentProfileData || {};
            form.fullName.value = p.name || "";
            form.phone.value = p.phone || "";
            form.gender.value = p.gender || "";
            form.dob.value = p.dob || "";
            form.graduationYear.value = p.graduationYear || "";
            form.department.value = p.department || "";
            form.degree.value = p.degree || "";
            form.company.value = p.company || "";
            form.jobPosition.value = p.jobPosition || "";
            form.location.value = p.location || "";
            form.linkedin.value = p.linkedin || "";
            form.bio.value = p.bio || "";
            if (imagePreview) {
                imagePreview.src = p.profileImage || "assets/images/avatar-default.svg";
            }
            editModal.classList.add("active");
        });
    }

    const closeModal = () => editModal.classList.remove("active");
    if (closeBtn) closeBtn.addEventListener("click", closeModal);
    if (cancelBtn) cancelBtn.addEventListener("click", closeModal);
    editModal.addEventListener("click", (e) => {
        if (e.target === editModal) closeModal();
    });

    if (imageInput && imagePreview) {
        imageInput.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    imagePreview.src = ev.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Submit Edit Form -> Real Firestore UPDATE
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        setButtonLoading(saveBtn, true, "Saving...", "Save Changes");

        const updatedName = form.fullName.value.trim();
        let profileImageUrl = currentProfileData.profileImage || "assets/images/avatar-default.svg";

        // Handle image upload if selected
        const newImageFile = imageInput ? imageInput.files[0] : null;
        if (newImageFile) {
            try {
                const storageRef = ref(storage, `profileImages/${currentAuthUser.uid}/${Date.now()}_${newImageFile.name}`);
                const uploadRes = await uploadBytes(storageRef, newImageFile);
                profileImageUrl = await getDownloadURL(uploadRes.ref);
            } catch (storageErr) {
                console.warn("Storage upload error (fallback):", storageErr);
                if (imagePreview && imagePreview.src.startsWith("data:")) {
                    profileImageUrl = imagePreview.src;
                }
            }
        }

        const updatedData = {
            name: updatedName,
            phone: form.phone.value.trim(),
            gender: form.gender.value,
            dob: form.dob.value,
            graduationYear: form.graduationYear.value.trim(),
            department: form.department.value,
            degree: form.degree.value,
            company: form.company.value.trim(),
            jobPosition: form.jobPosition.value.trim(),
            location: form.location.value.trim(),
            linkedin: form.linkedin.value.trim(),
            bio: form.bio.value.trim(),
            profileImage: profileImageUrl,
            updatedAt: new Date().toISOString()
        };

        try {
            // Update the existing alumni record using setDoc with merge or updateDoc
            // (Does NOT create duplicate document)
            const alumniRef = doc(db, "alumni", currentAuthUser.uid);
            await setDoc(alumniRef, updatedData, { merge: true });

            // Sync name in users/{uid} collection
            const userRef = doc(db, "users", currentAuthUser.uid);
            await setDoc(userRef, { name: updatedName }, { merge: true });

            // Update in-memory state
            currentProfileData = { ...currentProfileData, ...updatedData };

            // Dynamically refresh view without full page reload
            renderProfileView(currentProfileData);
            closeModal();
            showToast("Profile updated successfully!", "success");

        } catch (error) {
            console.error("Failed to update profile:", error);
            showToast("Failed to update profile: " + error.message, "error");
        } finally {
            setButtonLoading(saveBtn, false, "Saving...", "Save Changes");
        }
    });
}
