// =============================================================================
// Admin Jobs Management Controller (Full CRUD)
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

let jobsList = [];

document.addEventListener("DOMContentLoaded", () => {
    checkAuthState({
        requiredRole: "admin",
        allowAnonymous: false,
        onUserReady: (user, role, userData) => {
            initAdminLayout(user, userData);
            loadAdminJobs();
            setupJobFormModal();
            setupSearch();
        }
    });
});

async function loadAdminJobs() {
    const tbody = document.getElementById("admin-jobs-table-body");
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="padding: 2.5rem;"><div class="spinner"></div><p>Loading jobs...</p></td></tr>`;

    try {
        const snap = await getDocs(collection(db, "jobs"));
        jobsList = [];
        snap.forEach((docSnap) => {
            jobsList.push({ id: docSnap.id, ...docSnap.data() });
        });

        renderJobsTable(jobsList);
    } catch (error) {
        console.error("Failed to load jobs:", error);
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted" style="padding: 2rem;">Failed to load jobs from Firestore.</td></tr>`;
    }
}

function renderJobsTable(list) {
    const tbody = document.getElementById("admin-jobs-table-body");
    const countBadge = document.getElementById("total-jobs-count");
    if (!tbody) return;

    if (countBadge) countBadge.textContent = `${list.length} Jobs`;

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted" style="padding: 3rem;">No job listings found. Click "+ Add Job" to create one.</td></tr>`;
        return;
    }

    let rows = "";
    list.forEach((j) => {
        rows += `
            <tr>
                <td><strong>${escapeHtml(j.title)}</strong></td>
                <td>${escapeHtml(j.company)}</td>
                <td>${escapeHtml(j.location || "Remote/Onsite")}</td>
                <td><span class="badge badge-success">${escapeHtml(j.type || "Full-time")}</span></td>
                <td>${escapeHtml(j.salary || "Not specified")}</td>
                <td>${escapeHtml(j.postedDate || "Recent")}</td>
                <td>
                    <div class="table-actions">
                        <button type="button" class="btn btn-outline-primary btn-icon edit-job-btn" data-id="${j.id}" title="Edit">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                        <button type="button" class="btn btn-outline-danger btn-icon delete-job-btn" data-id="${j.id}" title="Delete">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = rows;

    tbody.querySelectorAll(".edit-job-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            const j = jobsList.find((item) => item.id === btn.dataset.id);
            if (j) openEditModal(j);
        });
    });

    tbody.querySelectorAll(".delete-job-btn").forEach((btn) => {
        btn.addEventListener("click", () => deleteJob(btn.dataset.id));
    });
}

function setupJobFormModal() {
    const modal = document.getElementById("admin-job-modal");
    const openAddBtn = document.getElementById("open-add-job-btn");
    const closeBtn = document.getElementById("close-job-modal");
    const cancelBtn = document.getElementById("cancel-job-modal");
    const form = document.getElementById("admin-job-form");
    const saveBtn = document.getElementById("save-job-btn");
    const modalTitle = document.getElementById("job-modal-title");

    if (openAddBtn) {
        openAddBtn.addEventListener("click", () => {
            form.reset();
            form.jobDocId.value = "";
            form.postedDate.value = new Date().toISOString().split("T")[0];
            modalTitle.textContent = "Add New Job Opportunity";
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
            setButtonLoading(saveBtn, true, "Saving...", "Save Job");

            const isEdit = Boolean(form.jobDocId.value);
            const docId = form.jobDocId.value;

            const payload = {
                title: form.title.value.trim(),
                company: form.company.value.trim(),
                location: form.location.value.trim(),
                type: form.type.value,
                description: form.description.value.trim(),
                salary: form.salary.value.trim(),
                applicationLink: form.applicationLink.value.trim(),
                postedDate: form.postedDate.value || new Date().toISOString().split("T")[0],
                updatedAt: new Date().toISOString()
            };

            try {
                if (isEdit) {
                    await updateDoc(doc(db, "jobs", docId), payload);
                    const idx = jobsList.findIndex((item) => item.id === docId);
                    if (idx !== -1) jobsList[idx] = { id: docId, ...payload };
                    showToast("Job updated successfully.", "success");
                } else {
                    payload.createdAt = new Date().toISOString();
                    const docRef = await addDoc(collection(db, "jobs"), payload);
                    jobsList.unshift({ id: docRef.id, ...payload });
                    showToast("Job added successfully.", "success");
                }

                closeModal();
                renderJobsTable(jobsList);

            } catch (err) {
                console.error("Save job failed:", err);
                showToast("Failed to save job: " + err.message, "error");
            } finally {
                setButtonLoading(saveBtn, false, "Saving...", "Save Job");
            }
        });
    }
}

function openEditModal(j) {
    const modal = document.getElementById("admin-job-modal");
    const form = document.getElementById("admin-job-form");
    const modalTitle = document.getElementById("job-modal-title");
    if (!modal || !form) return;

    form.jobDocId.value = j.id;
    form.title.value = j.title || "";
    form.company.value = j.company || "";
    form.location.value = j.location || "";
    form.type.value = j.type || "Full-time";
    form.salary.value = j.salary || "";
    form.applicationLink.value = j.applicationLink || "";
    form.postedDate.value = j.postedDate || "";
    form.description.value = j.description || "";

    modalTitle.textContent = "Edit Job Opportunity";
    modal.classList.add("active");
}

async function deleteJob(id) {
    const j = jobsList.find((item) => item.id === id);
    if (!j) return;

    const confirmed = await showConfirmModal({
        title: "Delete Job Listing",
        message: `Are you sure you want to delete job "${j.title}" at ${j.company}?`,
        confirmText: "Delete Job",
        isDangerous: true
    });

    if (!confirmed) return;

    try {
        await deleteDoc(doc(db, "jobs", id));
        jobsList = jobsList.filter((item) => item.id !== id);
        renderJobsTable(jobsList);
        showToast("Job deleted successfully.", "success");
    } catch (err) {
        console.error("Delete job failed:", err);
        showToast("Failed to delete job: " + err.message, "error");
    }
}

function setupSearch() {
    const searchInput = document.getElementById("admin-jobs-search");
    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            const q = e.target.value.trim().toLowerCase();
            const filtered = jobsList.filter((j) =>
                (j.title && j.title.toLowerCase().includes(q)) ||
                (j.company && j.company.toLowerCase().includes(q)) ||
                (j.location && j.location.toLowerCase().includes(q))
            );
            renderJobsTable(filtered);
        });
    }
}
