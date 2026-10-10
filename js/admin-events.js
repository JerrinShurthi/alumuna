// =============================================================================
// Admin Events Management Controller (Full CRUD)
// =============================================================================

import { checkAuthState } from "./auth.js";
import { initAdminLayout } from "./admin.js";
import { renderLoading, renderEmpty, escapeHtml, showToast, showConfirmModal, setButtonLoading, formatDate } from "./utils.js";
import { db, storage } from "./firebase-config.js";
import {
    collection,
    getDocs,
    doc,
    addDoc,
    updateDoc,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

let eventsList = [];

document.addEventListener("DOMContentLoaded", () => {
    checkAuthState({
        requiredRole: "admin",
        allowAnonymous: false,
        onUserReady: (user, role, userData) => {
            initAdminLayout(user, userData);
            loadAdminEvents();
            setupEventFormModal();
            setupSearch();
        }
    });
});

async function loadAdminEvents() {
    const tbody = document.getElementById("admin-events-table-body");
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="padding: 2.5rem;"><div class="spinner"></div><p>Loading events...</p></td></tr>`;

    try {
        const snap = await getDocs(collection(db, "events"));
        eventsList = [];
        snap.forEach((docSnap) => {
            eventsList.push({ id: docSnap.id, ...docSnap.data() });
        });

        eventsList.sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
        renderEventsTable(eventsList);

    } catch (error) {
        console.error("Failed to load events:", error);
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted" style="padding: 2rem;">Failed to load events from Firestore.</td></tr>`;
    }
}

function renderEventsTable(list) {
    const tbody = document.getElementById("admin-events-table-body");
    const countBadge = document.getElementById("total-events-count");
    if (!tbody) return;

    if (countBadge) countBadge.textContent = `${list.length} Events`;

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted" style="padding: 3rem;">No events scheduled. Click "+ Add Event" to create one.</td></tr>`;
        return;
    }

    let rows = "";
    list.forEach((ev) => {
        const img = ev.imageUrl || "assets/images/event-placeholder.svg";
        rows += `
            <tr>
                <td>
                    <img src="${img}" style="width: 52px; height: 36px; object-fit: cover; border-radius: var(--radius-sm);" alt="Event" onerror="this.src='assets/images/event-placeholder.svg'">
                </td>
                <td><strong>${escapeHtml(ev.title)}</strong></td>
                <td>📅 ${escapeHtml(ev.date || "N/A")}</td>
                <td>⏰ ${escapeHtml(ev.time || "N/A")}</td>
                <td>📍 ${escapeHtml(ev.venue || "N/A")}</td>
                <td>${escapeHtml(ev.organizer || "Alumni Association")}</td>
                <td>
                    <div class="table-actions">
                        <button type="button" class="btn btn-outline-primary btn-icon edit-event-btn" data-id="${ev.id}" title="Edit">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                        <button type="button" class="btn btn-outline-danger btn-icon delete-event-btn" data-id="${ev.id}" title="Delete">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = rows;

    tbody.querySelectorAll(".edit-event-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            const ev = eventsList.find((item) => item.id === btn.dataset.id);
            if (ev) openEditModal(ev);
        });
    });

    tbody.querySelectorAll(".delete-event-btn").forEach((btn) => {
        btn.addEventListener("click", () => deleteEvent(btn.dataset.id));
    });
}

function setupEventFormModal() {
    const modal = document.getElementById("admin-event-modal");
    const openAddBtn = document.getElementById("open-add-event-btn");
    const closeBtn = document.getElementById("close-event-modal");
    const cancelBtn = document.getElementById("cancel-event-modal");
    const form = document.getElementById("admin-event-form");
    const saveBtn = document.getElementById("save-event-btn");
    const modalTitle = document.getElementById("event-modal-title");
    const imageInput = document.getElementById("event-image-input");

    if (openAddBtn) {
        openAddBtn.addEventListener("click", () => {
            form.reset();
            form.eventDocId.value = "";
            form.existingImageUrl.value = "";
            modalTitle.textContent = "Add New Event";
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
            setButtonLoading(saveBtn, true, "Saving...", "Save Event");

            const isEdit = Boolean(form.eventDocId.value);
            const docId = form.eventDocId.value;

            let imageUrl = form.existingImageUrl.value || "assets/images/event-placeholder.svg";
            const file = imageInput ? imageInput.files[0] : null;

            if (file) {
                try {
                    const storageRef = ref(storage, `eventImages/${Date.now()}_${file.name}`);
                    const uploadRes = await uploadBytes(storageRef, file);
                    imageUrl = await getDownloadURL(uploadRes.ref);
                } catch (err) {
                    console.warn("Event image upload error:", err);
                }
            }

            const payload = {
                title: form.title.value.trim(),
                description: form.description.value.trim(),
                date: form.date.value,
                time: form.time.value,
                venue: form.venue.value.trim(),
                organizer: form.organizer.value.trim(),
                imageUrl,
                updatedAt: new Date().toISOString()
            };

            try {
                if (isEdit) {
                    await updateDoc(doc(db, "events", docId), payload);
                    const idx = eventsList.findIndex((item) => item.id === docId);
                    if (idx !== -1) eventsList[idx] = { id: docId, ...payload };
                    showToast("Event updated successfully.", "success");
                } else {
                    payload.createdAt = new Date().toISOString();
                    const docRef = await addDoc(collection(db, "events"), payload);
                    eventsList.unshift({ id: docRef.id, ...payload });
                    showToast("Event created successfully.", "success");
                }

                closeModal();
                renderEventsTable(eventsList);

            } catch (err) {
                console.error("Save event failed:", err);
                showToast("Failed to save event: " + err.message, "error");
            } finally {
                setButtonLoading(saveBtn, false, "Saving...", "Save Event");
            }
        });
    }
}

function openEditModal(ev) {
    const modal = document.getElementById("admin-event-modal");
    const form = document.getElementById("admin-event-form");
    const modalTitle = document.getElementById("event-modal-title");
    if (!modal || !form) return;

    form.eventDocId.value = ev.id;
    form.title.value = ev.title || "";
    form.description.value = ev.description || "";
    form.date.value = ev.date || "";
    form.time.value = ev.time || "";
    form.venue.value = ev.venue || "";
    form.organizer.value = ev.organizer || "";
    form.existingImageUrl.value = ev.imageUrl || "";

    modalTitle.textContent = "Edit Event Details";
    modal.classList.add("active");
}

async function deleteEvent(id) {
    const ev = eventsList.find((e) => e.id === id);
    if (!ev) return;

    const confirmed = await showConfirmModal({
        title: "Delete Event",
        message: `Are you sure you want to delete event "${ev.title}"?`,
        confirmText: "Delete Event",
        isDangerous: true
    });

    if (!confirmed) return;

    try {
        await deleteDoc(doc(db, "events", id));
        eventsList = eventsList.filter((e) => e.id !== id);
        renderEventsTable(eventsList);
        showToast("Event deleted successfully.", "success");
    } catch (err) {
        console.error("Delete event failed:", err);
        showToast("Failed to delete event: " + err.message, "error");
    }
}

function setupSearch() {
    const searchInput = document.getElementById("admin-events-search");
    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            const q = e.target.value.trim().toLowerCase();
            const filtered = eventsList.filter((ev) =>
                (ev.title && ev.title.toLowerCase().includes(q)) ||
                (ev.venue && ev.venue.toLowerCase().includes(q)) ||
                (ev.organizer && ev.organizer.toLowerCase().includes(q))
            );
            renderEventsTable(filtered);
        });
    }
}
