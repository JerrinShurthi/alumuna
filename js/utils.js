// =============================================================================
// Reusable Utility Functions
// =============================================================================

import { isFirebaseConfigured } from "./firebase-config.js";

/**
 * Show a toast notification on the screen
 * @param {string} message - Notification text
 * @param {'success'|'error'|'warning'|'info'} type - Type of toast
 * @param {number} duration - Time in milliseconds before disappearing
 */
export function showToast(message, type = "info", duration = 4000) {
    let container = document.getElementById("toast-container");
    if (!container) {
        container = document.createElement("div");
        container.id = "toast-container";
        container.className = "toast-container";
        document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `toast toast-${type} toast-enter`;

    const icons = {
        success: `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`,
        error: `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`,
        warning: `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
        info: `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`
    };

    toast.innerHTML = `
        <div class="toast-content">
            ${icons[type] || icons.info}
            <span class="toast-message">${escapeHtml(message)}</span>
        </div>
        <button class="toast-close" aria-label="Close">&times;</button>
    `;

    container.appendChild(toast);

    const closeBtn = toast.querySelector(".toast-close");
    const removeToast = () => {
        toast.classList.remove("toast-enter");
        toast.classList.add("toast-leave");
        setTimeout(() => toast.remove(), 300);
    };

    closeBtn.addEventListener("click", removeToast);
    setTimeout(removeToast, duration);
}

/**
 * Display a confirmation modal dialog
 * @param {Object} options
 * @param {string} options.title
 * @param {string} options.message
 * @param {string} [options.confirmText='Confirm']
 * @param {string} [options.cancelText='Cancel']
 * @param {boolean} [options.isDangerous=false]
 * @returns {Promise<boolean>}
 */
export function showConfirmModal({
    title = "Confirm Action",
    message = "Are you sure you want to proceed? This action cannot be undone.",
    confirmText = "Delete",
    cancelText = "Cancel",
    isDangerous = true
}) {
    return new Promise((resolve) => {
        let existing = document.getElementById("custom-confirm-modal");
        if (existing) existing.remove();

        const overlay = document.createElement("div");
        overlay.id = "custom-confirm-modal";
        overlay.className = "modal-overlay active";

        overlay.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-header">
                    <h3 class="modal-title">${escapeHtml(title)}</h3>
                    <button class="modal-close-btn" id="modal-cancel-x">&times;</button>
                </div>
                <div class="modal-body">
                    <p class="modal-desc">${escapeHtml(message)}</p>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" id="modal-cancel-btn">${escapeHtml(cancelText)}</button>
                    <button type="button" class="btn ${isDangerous ? 'btn-danger' : 'btn-primary'}" id="modal-confirm-btn">${escapeHtml(confirmText)}</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        const cleanup = (result) => {
            overlay.classList.remove("active");
            setTimeout(() => overlay.remove(), 200);
            resolve(result);
        };

        overlay.querySelector("#modal-confirm-btn").addEventListener("click", () => cleanup(true));
        overlay.querySelector("#modal-cancel-btn").addEventListener("click", () => cleanup(false));
        overlay.querySelector("#modal-cancel-x").addEventListener("click", () => cleanup(false));
        overlay.addEventListener("click", (e) => {
            if (e.target === overlay) cleanup(false);
        });
    });
}

/**
 * Escape HTML to prevent XSS attacks
 * @param {string} str
 * @returns {string}
 */
export function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/**
 * Format a timestamp or date string into user-friendly format
 * @param {any} dateVal
 * @param {boolean} includeTime
 * @returns {string}
 */
export function formatDate(dateVal, includeTime = false) {
    if (!dateVal) return "N/A";

    let date;
    if (dateVal && typeof dateVal.toDate === "function") {
        date = dateVal.toDate();
    } else if (dateVal instanceof Date) {
        date = dateVal;
    } else if (typeof dateVal === "string" || typeof dateVal === "number") {
        date = new Date(dateVal);
    } else {
        return "N/A";
    }

    if (isNaN(date.getTime())) return String(dateVal);

    const options = {
        year: "numeric",
        month: "short",
        day: "numeric"
    };

    if (includeTime) {
        options.hour = "2-digit";
        options.minute = "2-digit";
    }

    return date.toLocaleDateString("en-US", options);
}

/**
 * Truncate long string
 * @param {string} str
 * @param {number} maxLen
 * @returns {string}
 */
export function truncate(str, maxLen = 100) {
    if (!str) return "";
    if (str.length <= maxLen) return str;
    return str.slice(0, maxLen) + "...";
}

/**
 * Set loading state on a button
 * @param {HTMLButtonElement} button
 * @param {boolean} isLoading
 * @param {string} [loadingText='Processing...']
 * @param {string} [originalText]
 */
export function setButtonLoading(button, isLoading, loadingText = "Processing...", originalText = null) {
    if (!button) return;
    if (isLoading) {
        if (!button.dataset.originalText) {
            button.dataset.originalText = originalText || button.innerHTML;
        }
        button.disabled = true;
        button.innerHTML = `<span class="spinner-sm"></span> ${escapeHtml(loadingText)}`;
    } else {
        button.disabled = false;
        button.innerHTML = button.dataset.originalText || "Submit";
    }
}

/**
 * Render loading indicator in a container
 * @param {HTMLElement} container
 * @param {string} [text='Loading data...']
 */
export function renderLoading(container, text = "Loading...") {
    if (!container) return;
    container.innerHTML = `
        <div class="loading-state">
            <div class="spinner"></div>
            <p>${escapeHtml(text)}</p>
        </div>
    `;
}

/**
 * Render empty state in a container
 * @param {HTMLElement} container
 * @param {string} message
 * @param {string} [actionHtml]
 */
export function renderEmpty(container, message = "No records found.", actionHtml = "") {
    if (!container) return;
    container.innerHTML = `
        <div class="empty-state">
            <div class="empty-icon">
                <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
            </div>
            <h4 class="empty-title">Nothing to display</h4>
            <p class="empty-desc">${escapeHtml(message)}</p>
            ${actionHtml}
        </div>
    `;
}

/**
 * Render error message in a container
 * @param {HTMLElement} container
 * @param {string} message
 */
export function renderError(container, message = "Failed to load data. Please try again.") {
    if (!container) return;
    container.innerHTML = `
        <div class="error-state">
            <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
            <p>${escapeHtml(message)}</p>
        </div>
    `;
}

/**
 * Calculate profile completion percentage
 * @param {Object} profile
 * @returns {number} 0-100
 */
export function calculateProfileCompletion(profile) {
    if (!profile) return 0;
    const trackedFields = [
        "name",
        "phone",
        "gender",
        "dob",
        "graduationYear",
        "department",
        "degree",
        "company",
        "jobPosition",
        "location",
        "linkedin",
        "bio",
        "profileImage"
    ];

    let filled = 0;
    trackedFields.forEach((field) => {
        const val = profile[field];
        if (val !== undefined && val !== null && String(val).trim() !== "" && !String(val).includes("avatar-default.svg")) {
            filled++;
        }
    });

    return Math.round((filled / trackedFields.length) * 100);
}

/**
 * Check if Firebase credentials need to be configured and display helpful notice
 */
export function checkFirebaseNotice() {
    if (!isFirebaseConfigured()) {
        const noticeId = "firebase-unconfigured-notice";
        if (!document.getElementById(noticeId)) {
            const notice = document.createElement("div");
            notice.id = noticeId;
            notice.className = "firebase-notice-banner";
            notice.innerHTML = `
                <div class="banner-inner">
                    <span>⚠️ <strong>Firebase Configuration Required:</strong> Please open <code>js/firebase-config.js</code> and insert your Firebase Web project credentials to enable live database & auth operations.</span>
                </div>
            `;
            document.body.prepend(notice);
        }
    }
}

/**
 * Initialize mobile menu toggler on public/alumni pages
 */
export function initMobileNav() {
    const toggleBtn = document.querySelector(".nav-toggle");
    const navLinks = document.querySelector(".nav-links");

    if (toggleBtn && navLinks) {
        toggleBtn.addEventListener("click", () => {
            navLinks.classList.toggle("open");
            toggleBtn.classList.toggle("active");
            toggleBtn.setAttribute("aria-expanded", navLinks.classList.contains("open"));
        });
    }

    // Highlight current nav item
    const currentPath = window.location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll(".nav-links a").forEach((link) => {
        const href = link.getAttribute("href");
        if (href === currentPath || (currentPath === "" && href === "index.html")) {
            link.classList.add("active");
        }
    });
}

// Auto-run config check and mobile nav on DOM load
document.addEventListener("DOMContentLoaded", () => {
    checkFirebaseNotice();
    initMobileNav();
});
