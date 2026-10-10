// =============================================================================
// Alumni Achievements Controller (User-specific CRUD)
// =============================================================================

import { checkAuthState, logoutUser } from "./auth.js";
import { renderLoading, renderEmpty, escapeHtml, showToast, showConfirmModal, setButtonLoading } from "./utils.js";
import { db, storage } from "./firebase-config.js";
import {
    collection,
    query,
    where,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    doc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

let currentAuthUser = null;
let userAchievements = [];

document.addEventListener("DOMContentLoaded", () => {
    // Route guard: user must be logged in
    checkAuthState({
        allowAnonymous: false,
        onUserReady: async (user) => {
            currentAuthUser = user;
            await loadUserAchievements(user.uid);
            setupAchievementForm();
        }
    });

    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) logoutBtn.addEventListener("click", () => logoutUser());
});

async function loadUserAchievements(uid) {
    const container = document.getElementById("achievements-container");
    if (!container) return;

    renderLoading(container, "Loading your achievements...");

    try {
        const q = query(collection(db, "achievements"), where("userId", "==", uid));
        const snap = await getDocs(q);

        userAchievements = [];
        snap.forEach((docSnap) => {
            userAchievements.push({ id: docSnap.id, ...docSnap.data() });
        });

        // Sort by date descending
        userAchievements.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

        renderAchievementsList(userAchievements);

    } catch (error) {
        console.error("Error loading achievements:", error);
        renderEmpty(container, "Unable to load achievements from Firestore.");
    }
}

function renderAchievementsList(list) {
    const container = document.getElementById("achievements-container");
    const countBadge = document.getElementById("achievements-count");
    if (!container) return;

    if (countBadge) countBadge.textContent = `${list.length} Shared`;

    if (list.length === 0) {
        renderEmpty(
            container,
            "You haven't added any achievements yet. Share your awards, honors, promotions, or certifications!",
            `<button class="btn btn-primary btn-sm" id="empty-add-btn">+ Add Your First Achievement</button>`
        );
        const emptyAdd = document.getElementById("empty-add-btn");
        if (emptyAdd) emptyAdd.addEventListener("click", () => openAddModal());
        return;
    }

    container.innerHTML = "";
    const grid = document.createElement("div");
    grid.className = "grid-2";

    list.forEach((item) => {
        const card = document.createElement("div");
        card.className = "card achievement-card";

        card.innerHTML = `
            <div class="achievement-header">
                <div>
                    <h3 class="achievement-title">${escapeHtml(item.title)}</h3>
                    <div class="achievement-org">🏢 ${escapeHtml(item.organization || "Organization")}</div>
                </div>
                <span class="achievement-date">📅 ${escapeHtml(item.date || "")}</span>
            </div>

            <p class="achievement-desc">${escapeHtml(item.description || "")}</p>

            ${item.imageUrl ? `
                <div style="margin-bottom: 1rem;">
                    <a href="${escapeHtml(item.imageUrl)}" target="_blank" rel="noopener noreferrer" style="font-size: 0.85rem; color: var(--secondary);">
                        🔗 View Attached Certificate / Photo
                    </a>
                </div>
            ` : ""}

            <div class="achievement-actions">
                <button type="button" class="btn btn-secondary btn-sm edit-achieve-btn" data-id="${item.id}">Edit</button>
                <button type="button" class="btn btn-outline-danger btn-sm delete-achieve-btn" data-id="${item.id}">Delete</button>
            </div>
        `;

        grid.appendChild(card);
    });

    container.appendChild(grid);

    // Event listeners for Edit & Delete
    container.querySelectorAll(".edit-achieve-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            const item = userAchievements.find((a) => a.id === btn.dataset.id);
            if (item) openEditModal(item);
        });
    });

    container.querySelectorAll(".delete-achieve-btn").forEach((btn) => {
        btn.addEventListener("click", () => handleDeleteAchievement(btn.dataset.id));
    });
}

function setupAchievementForm() {
    const modal = document.getElementById("achievement-modal");
    const openBtn = document.getElementById("open-add-achievement-btn");
    const closeBtn = document.getElementById("close-achievement-modal");
    const cancelBtn = document.getElementById("cancel-achievement-btn");
    const form = document.getElementById("achievement-form");
    const saveBtn = document.getElementById("save-achievement-btn");
    const imageInput = document.getElementById("achievement-image-input");

    if (!modal || !form) return;

    if (openBtn) openBtn.addEventListener("click", () => openAddModal());

    const closeModal = () => modal.classList.remove("active");
    if (closeBtn) closeBtn.addEventListener("click", closeModal);
    if (cancelBtn) cancelBtn.addEventListener("click", closeModal);
    modal.addEventListener("click", (e) => {
        if (e.target === modal) closeModal();
    });

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        setButtonLoading(saveBtn, true, "Saving...", "Save Achievement");

        const isEditing = Boolean(form.achievementId.value);
        const achievementId = form.achievementId.value;

        const title = form.title.value.trim();
        const organization = form.organization.value.trim();
        const date = form.date.value;
        const description = form.description.value.trim();
        let imageUrl = form.existingImageUrl ? form.existingImageUrl.value : "";

        // Image upload if selected
        const file = imageInput ? imageInput.files[0] : null;
        if (file) {
            try {
                const storageRef = ref(storage, `achievementImages/${currentAuthUser.uid}/${Date.now()}_${file.name}`);
                const uploadRes = await uploadBytes(storageRef, file);
                imageUrl = await getDownloadURL(uploadRes.ref);
            } catch (err) {
                console.warn("Storage upload fallback:", err);
            }
        }

        const payload = {
            userId: currentAuthUser.uid, // Strictly link to authenticated user
            title,
            organization,
            date,
            description,
            imageUrl,
            updatedAt: new Date().toISOString()
        };

        try {
            if (isEditing) {
                // Verify user owns achievement before updating
                const existing = userAchievements.find((a) => a.id === achievementId);
                if (!existing || existing.userId !== currentAuthUser.uid) {
                    throw new Error("Unauthorized: You do not own this achievement.");
                }

                await updateDoc(doc(db, "achievements", achievementId), payload);

                // Update in memory
                const idx = userAchievements.findIndex((a) => a.id === achievementId);
                if (idx !== -1) userAchievements[idx] = { id: achievementId, ...payload };

                showToast("Achievement updated successfully!", "success");
            } else {
                // CREATE
                payload.createdAt = new Date().toISOString();
                const docRef = await addDoc(collection(db, "achievements"), payload);
                userAchievements.unshift({ id: docRef.id, ...payload });

                showToast("Achievement added successfully!", "success");
            }

            closeModal();
            renderAchievementsList(userAchievements);

        } catch (error) {
            console.error("Save achievement failed:", error);
            showToast("Failed to save achievement: " + error.message, "error");
        } finally {
            setButtonLoading(saveBtn, false, "Saving...", "Save Achievement");
        }
    });
}

function openAddModal() {
    const modal = document.getElementById("achievement-modal");
    const form = document.getElementById("achievement-form");
    const title = document.getElementById("achievement-modal-title");
    if (!modal || !form) return;

    form.reset();
    form.achievementId.value = "";
    if (form.existingImageUrl) form.existingImageUrl.value = "";
    if (title) title.textContent = "Add New Achievement";

    modal.classList.add("active");
}

function openEditModal(item) {
    const modal = document.getElementById("achievement-modal");
    const form = document.getElementById("achievement-form");
    const title = document.getElementById("achievement-modal-title");
    if (!modal || !form) return;

    form.achievementId.value = item.id;
    form.title.value = item.title || "";
    form.organization.value = item.organization || "";
    form.date.value = item.date || "";
    form.description.value = item.description || "";
    if (form.existingImageUrl) form.existingImageUrl.value = item.imageUrl || "";
    if (title) title.textContent = "Edit Achievement";

    modal.classList.add("active");
}

async function handleDeleteAchievement(id) {
    const item = userAchievements.find((a) => a.id === id);
    if (!item) return;

    if (item.userId !== currentAuthUser.uid) {
        showToast("Unauthorized: You can only delete your own achievements.", "error");
        return;
    }

    const confirmed = await showConfirmModal({
        title: "Delete Achievement",
        message: `Are you sure you want to delete "${item.title}"? This action cannot be undone.`,
        confirmText: "Yes, Delete",
        cancelText: "Cancel",
        isDangerous: true
    });

    if (!confirmed) return;

    try {
        await deleteDoc(doc(db, "achievements", id));
        userAchievements = userAchievements.filter((a) => a.id !== id);
        renderAchievementsList(userAchievements);
        showToast("Achievement deleted successfully.", "success");
    } catch (error) {
        console.error("Delete failed:", error);
        showToast("Failed to delete achievement: " + error.message, "error");
    }
}
