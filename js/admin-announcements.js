// =============================================================================
// Admin Announcements Management Controller (Full CRUD)
// =============================================================================

import { checkAuthState } from "./auth.js";
import { initAdminLayout } from "./admin.js";
import { renderLoading, renderEmpty, escapeHtml, showToast, showConfirmModal, setButtonLoading } from "./utils.js";
import { db } from "./firebase-config.js";
import {
    collection,
    getDocs,
    doc,
    addDoc,
    updateDoc,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let announcementsList = [];

document.addEventListener("DOMContentLoaded", () => {
    checkAuthState({
        requiredRole: "admin",
        allowAnonymous: false,
        onUserReady: (user, role, userData) => {
            initAdminLayout(user, userData);
            loadAdminAnnouncements();
            setupAnnouncementFormModal();
        }
    });
});

async function loadAdminAnnouncements() {
    const tbody = document.getElementById("admin-announcements-table-body");
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="5" class="text-center" style="padding: 2.5rem;"><div class="spinner"></div><p>Loading announcements...</p></td></tr>`;

    try {
        const snap = await getDocs(collection(db, "announcements"));
        announcementsList = [];
        snap.forEach((docSnap) => {
            announcementsList.push({ id: docSnap.id, ...docSnap.data() });
        });

        announcementsList.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
        renderAnnouncementsTable(announcementsList);
    } catch (error) {
        console.error("Failed to load announcements:", error);
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted" style="padding: 2rem;">Failed to load announcements from Firestore.</td></tr>`;
    }
}

function renderAnnouncementsTable(list) {
    const tbody = document.getElementById("admin-announcements-table-body");
    const countBadge = document.getElementById("total-announcements-count");
    if (!tbody) return;

    if (countBadge) countBadge.textContent = `${list.length} Announcements`;

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted" style="padding: 3rem;">No announcements found. Click "+ Add Announcement" to post one.</td></tr>`;
        return;
    }

    let rows = "";
    list.forEach((a) => {
        rows += `
            <tr>
                <td><strong>${escapeHtml(a.title)}</strong></td>
                <td>📅 ${escapeHtml(a.date || "N/A")}</td>
                <td>
                    ${a.isImportant ? '<span class="badge badge-warning">Important</span>' : '<span class="badge badge-secondary">Regular</span>'}
                </td>
                <td>${escapeHtml(a.description || "")}</td>
                <td>
                    <div class="table-actions">
                        <button type="button" class="btn btn-outline-primary btn-icon edit-ann-btn" data-id="${a.id}" title="Edit">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                        <button type="button" class="btn btn-outline-danger btn-icon delete-ann-btn" data-id="${a.id}" title="Delete">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = rows;

    tbody.querySelectorAll(".edit-ann-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            const item = announcementsList.find((a) => a.id === btn.dataset.id);
            if (item) openEditModal(item);
        });
    });

    tbody.querySelectorAll(".delete-ann-btn").forEach((btn) => {
        btn.addEventListener("click", () => deleteAnnouncement(btn.dataset.id));
    });
}

function setupAnnouncementFormModal() {
    const modal = document.getElementById("admin-announcement-modal");
    const openAddBtn = document.getElementById("open-add-announcement-btn");
    const closeBtn = document.getElementById("close-announcement-modal");
    const cancelBtn = document.getElementById("cancel-announcement-modal");
    const form = document.getElementById("admin-announcement-form");
    const saveBtn = document.getElementById("save-announcement-btn");
    const modalTitle = document.getElementById("announcement-modal-title");

    if (openAddBtn) {
        openAddBtn.addEventListener("click", () => {
            form.reset();
            form.annDocId.value = "";
            form.date.value = new Date().toISOString().split("T")[0];
            form.isImportant.checked = false;
            modalTitle.textContent = "Create New Announcement";
            modal.classList.add("active");
        });
    }

    const closeModal = () => modal.classList.remove("active");
    if (closeBtn) closeBtn.addEventListener("click", closeModal);
    if (cancelBtn) cancelBtn.addEventListener("click", closeModal);
    if (modal) modal.addEventListener("click", (e) => {
        if (e.target === modal) closeModal();
    });

    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            setButtonLoading(saveBtn, true, "Saving...", "Save Announcement");

            const isEdit = Boolean(form.annDocId.value);
            const docId = form.annDocId.value;

            const payload = {
                title: form.title.value.trim(),
                description: form.description.value.trim(),
                date: form.date.value || new Date().toISOString().split("T")[0],
                isImportant: Boolean(form.isImportant.checked),
                updatedAt: new Date().toISOString()
            };

            try {
                if (isEdit) {
                    await updateDoc(doc(db, "announcements", docId), payload);
                    const idx = announcementsList.findIndex((item) => item.id === docId);
                    if (idx !== -1) announcementsList[idx] = { id: docId, ...payload };
                    showToast("Announcement updated successfully.", "success");
                } else {
                    payload.createdAt = new Date().toISOString();
                    const docRef = await addDoc(collection(db, "announcements"), payload);
                    announcementsList.unshift({ id: docRef.id, ...payload });
                    showToast("Announcement published successfully.", "success");
                }

                closeModal();
                renderAnnouncementsTable(announcementsList);

            } catch (err) {
                console.error("Save announcement failed:", err);
                showToast("Failed to save announcement: " + err.message, "error");
            } finally {
                setButtonLoading(saveBtn, false, "Saving...", "Save Announcement");
            }
        });
    }
}

function openEditModal(a) {
    const modal = document.getElementById("admin-announcement-modal");
    const form = document.getElementById("admin-announcement-form");
    const modalTitle = document.getElementById("announcement-modal-title");
    if (!modal || !form) return;

    form.annDocId.value = a.id;
    form.title.value = a.title || "";
    form.description.value = a.description || "";
    form.date.value = a.date || "";
    form.isImportant.checked = Boolean(a.isImportant);

    modalTitle.textContent = "Edit Announcement";
    modal.classList.add("active");
}

async function deleteAnnouncement(id) {
    const a = announcementsList.find((item) => item.id === id);
    if (!a) return;

    const confirmed = await showConfirmModal({
        title: "Delete Announcement",
        message: `Are you sure you want to delete announcement "${a.title}"?`,
        confirmText: "Delete",
        isDangerous: true
    });

    if (!confirmed) return;

    try {
        await deleteDoc(doc(db, "announcements", id));
        announcementsList = announcementsList.filter((item) => item.id !== id);
        renderAnnouncementsTable(announcementsList);
        showToast("Announcement deleted successfully.", "success");
    } catch (err) {
        console.error("Delete announcement failed:", err);
        showToast("Failed to delete announcement: " + err.message, "error");
    }
}
