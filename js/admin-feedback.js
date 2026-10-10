// =============================================================================
// Admin Feedback Management Controller
// =============================================================================

import { checkAuthState } from "./auth.js";
import { initAdminLayout } from "./admin.js";
import { renderLoading, renderEmpty, escapeHtml, showToast, showConfirmModal, formatDate } from "./utils.js";
import { db } from "./firebase-config.js";
import {
    collection,
    getDocs,
    doc,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let feedbackList = [];

document.addEventListener("DOMContentLoaded", () => {
    checkAuthState({
        requiredRole: "admin",
        allowAnonymous: false,
        onUserReady: (user, role, userData) => {
            initAdminLayout(user, userData);
            loadFeedback();
            setupViewModal();
        }
    });
});

async function loadFeedback() {
    const tbody = document.getElementById("admin-feedback-table-body");
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="padding: 2.5rem;"><div class="spinner"></div><p>Loading messages...</p></td></tr>`;

    try {
        const snap = await getDocs(collection(db, "feedback"));
        feedbackList = [];
        snap.forEach((docSnap) => {
            feedbackList.push({ id: docSnap.id, ...docSnap.data() });
        });

        // Sort newest first
        feedbackList.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        renderFeedbackTable(feedbackList);

    } catch (error) {
        console.error("Failed to load feedback:", error);
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted" style="padding: 2rem;">Failed to load feedback from Firestore.</td></tr>`;
    }
}

function renderFeedbackTable(list) {
    const tbody = document.getElementById("admin-feedback-table-body");
    const countBadge = document.getElementById("total-feedback-count");
    if (!tbody) return;

    if (countBadge) countBadge.textContent = `${list.length} Inquiries`;

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted" style="padding: 3rem;">No feedback or contact messages submitted yet.</td></tr>`;
        return;
    }

    let rows = "";
    list.forEach((item) => {
        const dateStr = formatDate(item.createdAt, true);
        rows += `
            <tr>
                <td><strong>${escapeHtml(item.name || "Anonymous")}</strong></td>
                <td><a href="mailto:${escapeHtml(item.email)}">${escapeHtml(item.email || "N/A")}</a></td>
                <td>${escapeHtml(item.subject || "General Inquiry")}</td>
                <td style="max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    ${escapeHtml(item.message || "")}
                </td>
                <td>${escapeHtml(dateStr)}</td>
                <td>
                    <div class="table-actions">
                        <button type="button" class="btn btn-secondary btn-icon view-fb-btn" data-id="${item.id}" title="Read Full Message">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                        </button>
                        <button type="button" class="btn btn-outline-danger btn-icon delete-fb-btn" data-id="${item.id}" title="Delete Message">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = rows;

    tbody.querySelectorAll(".view-fb-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            const item = feedbackList.find((f) => f.id === btn.dataset.id);
            if (item) openViewModal(item);
        });
    });

    tbody.querySelectorAll(".delete-fb-btn").forEach((btn) => {
        btn.addEventListener("click", () => deleteFeedback(btn.dataset.id));
    });
}

function setupViewModal() {
    const modal = document.getElementById("admin-feedback-modal");
    const closeBtn = document.getElementById("close-feedback-modal");
    if (!modal) return;

    const closeModal = () => modal.classList.remove("active");
    if (closeBtn) closeBtn.addEventListener("click", closeModal);
    modal.addEventListener("click", (e) => {
        if (e.target === modal) closeModal();
    });
}

function openViewModal(item) {
    const modal = document.getElementById("admin-feedback-modal");
    if (!modal) return;

    document.getElementById("modal-fb-name").textContent = item.name || "Anonymous";
    document.getElementById("modal-fb-email").textContent = item.email || "N/A";
    document.getElementById("modal-fb-subject").textContent = item.subject || "No Subject";
    document.getElementById("modal-fb-date").textContent = formatDate(item.createdAt, true);
    document.getElementById("modal-fb-message").textContent = item.message || "";

    const replyLink = document.getElementById("modal-fb-reply-link");
    if (replyLink) {
        replyLink.href = `mailto:${encodeURIComponent(item.email)}?subject=${encodeURIComponent("Re: " + (item.subject || "Your Alumni Inquiry"))}`;
    }

    modal.classList.add("active");
}

async function deleteFeedback(id) {
    const confirmed = await showConfirmModal({
        title: "Delete Message",
        message: "Are you sure you want to delete this feedback message?",
        confirmText: "Delete",
        isDangerous: true
    });

    if (!confirmed) return;

    try {
        await deleteDoc(doc(db, "feedback", id));
        feedbackList = feedbackList.filter((f) => f.id !== id);
        renderFeedbackTable(feedbackList);
        showToast("Message deleted successfully.", "success");
    } catch (err) {
        console.error("Delete feedback failed:", err);
        showToast("Failed to delete message: " + err.message, "error");
    }
}
