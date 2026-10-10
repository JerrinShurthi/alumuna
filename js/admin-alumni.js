// =============================================================================
// Admin Alumni Management Controller (Full CRUD)
// =============================================================================

import { checkAuthState } from "./auth.js";
import { initAdminLayout } from "./admin.js";
import { renderLoading, renderEmpty, escapeHtml, showToast, showConfirmModal, setButtonLoading } from "./utils.js";
import { db, storage } from "./firebase-config.js";
import {
    collection,
    getDocs,
    doc,
    addDoc,
    setDoc,
    updateDoc,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

let alumniList = [];

document.addEventListener("DOMContentLoaded", () => {
    checkAuthState({
        requiredRole: "admin",
        allowAnonymous: false,
        onUserReady: (user, role, userData) => {
            initAdminLayout(user, userData);
            loadAdminAlumni();
            setupAlumniModals();
            setupSearchAndFilters();
        }
    });
});

async function loadAdminAlumni() {
    const tbody = document.getElementById("admin-alumni-table-body");
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="8" class="text-center" style="padding: 2.5rem;"><div class="spinner"></div><p>Loading alumni database...</p></td></tr>`;

    try {
        const snap = await getDocs(collection(db, "alumni"));
        alumniList = [];
        snap.forEach((docSnap) => {
            alumniList.push({ id: docSnap.id, ...docSnap.data() });
        });

        populateAdminFilters(alumniList);
        renderTable(alumniList);

    } catch (error) {
        console.error("Failed to load alumni records:", error);
        tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted" style="padding: 2rem;">Failed to load alumni from Firestore.</td></tr>`;
    }
}

function renderTable(list) {
    const tbody = document.getElementById("admin-alumni-table-body");
    const countBadge = document.getElementById("total-alumni-count");
    if (!tbody) return;

    if (countBadge) countBadge.textContent = `${list.length} Alumni`;

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted" style="padding: 3rem;">No alumni records found.</td></tr>`;
        return;
    }

    let rows = "";
    list.forEach((a) => {
        const img = a.profileImage || "assets/images/avatar-default.svg";
        rows += `
            <tr>
                <td>
                    <img src="${img}" class="table-avatar" alt="${escapeHtml(a.name)}" onerror="this.src='assets/images/avatar-default.svg'">
                </td>
                <td><strong>${escapeHtml(a.name || "N/A")}</strong></td>
                <td>${escapeHtml(a.email || "N/A")}</td>
                <td>${escapeHtml(a.department || "N/A")}</td>
                <td>${escapeHtml(a.graduationYear || "N/A")}</td>
                <td>${escapeHtml(a.company || "N/A")}</td>
                <td>${escapeHtml(a.location || "N/A")}</td>
                <td>
                    <div class="table-actions">
                        <button type="button" class="btn btn-secondary btn-icon view-btn" data-id="${a.id}" title="View">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                        </button>
                        <button type="button" class="btn btn-outline-primary btn-icon edit-btn" data-id="${a.id}" title="Edit">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                        <button type="button" class="btn btn-outline-danger btn-icon delete-btn" data-id="${a.id}" title="Delete">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = rows;

    // Attach Action Handlers
    tbody.querySelectorAll(".view-btn").forEach((b) => {
        b.addEventListener("click", () => {
            const a = alumniList.find((item) => item.id === b.dataset.id);
            if (a) openViewModal(a);
        });
    });

    tbody.querySelectorAll(".edit-btn").forEach((b) => {
        b.addEventListener("click", () => {
            const a = alumniList.find((item) => item.id === b.dataset.id);
            if (a) openEditModal(a);
        });
    });

    tbody.querySelectorAll(".delete-btn").forEach((b) => {
        b.addEventListener("click", () => deleteAlumni(b.dataset.id));
    });
}

function setupAlumniModals() {
    // Form Modal (Add / Edit)
    const formModal = document.getElementById("admin-alumni-modal");
    const openAddBtn = document.getElementById("open-add-alumni-btn");
    const closeFormBtn = document.getElementById("close-alumni-form-modal");
    const cancelFormBtn = document.getElementById("cancel-alumni-form-modal");
    const alumniForm = document.getElementById("admin-alumni-form");
    const saveBtn = document.getElementById("save-alumni-submit-btn");
    const modalTitle = document.getElementById("alumni-modal-title");
    const imageInput = document.getElementById("admin-alumni-image-input");

    // View Modal
    const viewModal = document.getElementById("admin-view-modal");
    const closeViewBtn = document.getElementById("close-view-modal");

    if (openAddBtn) {
        openAddBtn.addEventListener("click", () => {
            alumniForm.reset();
            alumniForm.alumniDocId.value = "";
            modalTitle.textContent = "Add New Alumni";
            formModal.classList.add("active");
        });
    }

    const closeForm = () => formModal.classList.remove("active");
    if (closeFormBtn) closeFormBtn.addEventListener("click", closeForm);
    if (cancelFormBtn) cancelFormBtn.addEventListener("click", closeForm);
    if (formModal) formModal.addEventListener("click", (e) => {
        if (e.target === formModal) closeForm();
    });

    const closeView = () => viewModal.classList.remove("active");
    if (closeViewBtn) closeViewBtn.addEventListener("click", closeView);
    if (viewModal) viewModal.addEventListener("click", (e) => {
        if (e.target === viewModal) closeView();
    });

    // Form Submit (CREATE / UPDATE)
    if (alumniForm) {
        alumniForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            setButtonLoading(saveBtn, true, "Saving...", "Save Alumni");

            const isEdit = Boolean(alumniForm.alumniDocId.value);
            const docId = alumniForm.alumniDocId.value;

            let profileImageUrl = alumniForm.existingImage.value || "assets/images/avatar-default.svg";
            const imageFile = imageInput ? imageInput.files[0] : null;

            if (imageFile) {
                try {
                    const storageRef = ref(storage, `profileImages/admin_${Date.now()}_${imageFile.name}`);
                    const uploadRes = await uploadBytes(storageRef, imageFile);
                    profileImageUrl = await getDownloadURL(uploadRes.ref);
                } catch (err) {
                    console.warn("Storage upload error:", err);
                }
            }

            const payload = {
                name: alumniForm.fullName.value.trim(),
                email: alumniForm.email.value.trim(),
                phone: alumniForm.phone.value.trim(),
                gender: alumniForm.gender.value,
                dob: alumniForm.dob.value,
                graduationYear: alumniForm.graduationYear.value.trim(),
                department: alumniForm.department.value,
                degree: alumniForm.degree.value,
                company: alumniForm.company.value.trim(),
                jobPosition: alumniForm.jobPosition.value.trim(),
                location: alumniForm.location.value.trim(),
                linkedin: alumniForm.linkedin.value.trim(),
                bio: alumniForm.bio.value.trim(),
                profileImage: profileImageUrl,
                updatedAt: new Date().toISOString()
            };

            try {
                if (isEdit) {
                    // UPDATE existing Firestore document
                    await updateDoc(doc(db, "alumni", docId), payload);
                    const idx = alumniList.findIndex((item) => item.id === docId);
                    if (idx !== -1) alumniList[idx] = { id: docId, ...payload };
                    showToast("Alumni updated successfully.", "success");
                } else {
                    // INSERT new Firestore document
                    payload.createdAt = new Date().toISOString();
                    const docRef = await addDoc(collection(db, "alumni"), payload);
                    alumniList.unshift({ id: docRef.id, ...payload });
                    showToast("Alumni added successfully.", "success");
                }

                closeForm();
                renderTable(alumniList);

            } catch (err) {
                console.error("Save alumni failed:", err);
                showToast("Failed to save alumni: " + err.message, "error");
            } finally {
                setButtonLoading(saveBtn, false, "Saving...", "Save Alumni");
            }
        });
    }
}

function openEditModal(a) {
    const formModal = document.getElementById("admin-alumni-modal");
    const alumniForm = document.getElementById("admin-alumni-form");
    const modalTitle = document.getElementById("alumni-modal-title");
    if (!formModal || !alumniForm) return;

    alumniForm.alumniDocId.value = a.id;
    alumniForm.fullName.value = a.name || "";
    alumniForm.email.value = a.email || "";
    alumniForm.phone.value = a.phone || "";
    alumniForm.gender.value = a.gender || "";
    alumniForm.dob.value = a.dob || "";
    alumniForm.graduationYear.value = a.graduationYear || "";
    alumniForm.department.value = a.department || "";
    alumniForm.degree.value = a.degree || "";
    alumniForm.company.value = a.company || "";
    alumniForm.jobPosition.value = a.jobPosition || "";
    alumniForm.location.value = a.location || "";
    alumniForm.linkedin.value = a.linkedin || "";
    alumniForm.bio.value = a.bio || "";
    alumniForm.existingImage.value = a.profileImage || "";

    modalTitle.textContent = "Edit Alumni Details";
    formModal.classList.add("active");
}

function openViewModal(a) {
    const viewModal = document.getElementById("admin-view-modal");
    if (!viewModal) return;

    document.getElementById("view-modal-avatar").src = a.profileImage || "assets/images/avatar-default.svg";
    document.getElementById("view-modal-name").textContent = a.name || "N/A";
    document.getElementById("view-modal-email").textContent = a.email || "N/A";
    document.getElementById("view-modal-phone").textContent = a.phone || "N/A";
    document.getElementById("view-modal-dept").textContent = a.department || "N/A";
    document.getElementById("view-modal-degree").textContent = a.degree || "N/A";
    document.getElementById("view-modal-year").textContent = a.graduationYear || "N/A";
    document.getElementById("view-modal-company").textContent = a.company || "N/A";
    document.getElementById("view-modal-position").textContent = a.jobPosition || "N/A";
    document.getElementById("view-modal-location").textContent = a.location || "N/A";
    document.getElementById("view-modal-bio").textContent = a.bio || "No biography.";

    viewModal.classList.add("active");
}

async function deleteAlumni(id) {
    const alumnus = alumniList.find((a) => a.id === id);
    if (!alumnus) return;

    const confirmed = await showConfirmModal({
        title: "Delete Alumni Record",
        message: `Are you sure you want to delete "${alumnus.name}"? This action cannot be undone.`,
        confirmText: "Delete Record",
        isDangerous: true
    });

    if (!confirmed) return;

    try {
        await deleteDoc(doc(db, "alumni", id));
        alumniList = alumniList.filter((a) => a.id !== id);
        renderTable(alumniList);
        showToast("Alumni deleted successfully.", "success");
    } catch (err) {
        console.error("Delete alumni failed:", err);
        showToast("Failed to delete alumni: " + err.message, "error");
    }
}

function populateAdminFilters(list) {
    const deptFilter = document.getElementById("admin-dept-filter");
    const yearFilter = document.getElementById("admin-year-filter");
    if (!deptFilter || !yearFilter) return;

    const depts = new Set();
    const years = new Set();

    list.forEach((item) => {
        if (item.department) depts.add(item.department);
        if (item.graduationYear) years.add(item.graduationYear);
    });

    if (deptFilter.options.length <= 1) {
        [...depts].sort().forEach((d) => deptFilter.add(new Option(d, d)));
    }
    if (yearFilter.options.length <= 1) {
        [...years].sort((a, b) => b - a).forEach((y) => yearFilter.add(new Option(y, y)));
    }
}

function setupSearchAndFilters() {
    const searchInput = document.getElementById("admin-alumni-search");
    const deptFilter = document.getElementById("admin-dept-filter");
    const yearFilter = document.getElementById("admin-year-filter");

    const filterHandler = () => {
        const q = (searchInput ? searchInput.value : "").trim().toLowerCase();
        const selDept = deptFilter ? deptFilter.value : "";
        const selYear = yearFilter ? yearFilter.value : "";

        const filtered = alumniList.filter((a) => {
            const matchesQuery = !q ||
                (a.name && a.name.toLowerCase().includes(q)) ||
                (a.email && a.email.toLowerCase().includes(q)) ||
                (a.company && a.company.toLowerCase().includes(q)) ||
                (a.location && a.location.toLowerCase().includes(q));

            const matchesDept = !selDept || a.department === selDept;
            const matchesYear = !selYear || String(a.graduationYear) === String(selYear);

            return matchesQuery && matchesDept && matchesYear;
        });

        renderTable(filtered);
    };

    if (searchInput) searchInput.addEventListener("input", filterHandler);
    if (deptFilter) deptFilter.addEventListener("change", filterHandler);
    if (yearFilter) yearFilter.addEventListener("change", filterHandler);
}
