// =============================================================================
// Admin Dashboard Controller & Layout Helpers
// =============================================================================

import { checkAuthState, logoutUser } from "./auth.js";
import { renderLoading, renderEmpty, escapeHtml, formatDate } from "./utils.js";
import { db } from "./firebase-config.js";
import { collection, getDocs, limit, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
    // Strictly guard page for admin role
    checkAuthState({
        requiredRole: "admin",
        allowAnonymous: false,
        onUserReady: (user, role, userData) => {
            initAdminLayout(user, userData);
            initAdminDashboard();
        }
    });
});

/**
 * Common layout initialization for all admin pages
 */
export function initAdminLayout(user, userData) {
    // Set admin user name in topbar
    const nameEl = document.getElementById("admin-user-name");
    const avatarEl = document.getElementById("admin-user-avatar");
    if (nameEl && user) {
        nameEl.textContent = (userData && userData.name) || user.displayName || "Administrator";
    }
    if (avatarEl && user) {
        avatarEl.textContent = ((userData && userData.name) || user.email || "A").charAt(0).toUpperCase();
    }

    // Sidebar active link
    const currentPath = window.location.pathname.split("/").pop() || "admin-dashboard.html";
    document.querySelectorAll(".sidebar-menu a").forEach((link) => {
        if (link.getAttribute("href") === currentPath) {
            link.classList.add("active");
        }
    });

    // Mobile sidebar toggle
    const toggleBtn = document.getElementById("sidebar-toggle-btn");
    const sidebar = document.querySelector(".admin-sidebar");
    const backdrop = document.getElementById("sidebar-backdrop");

    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener("click", () => {
            sidebar.classList.toggle("sidebar-open");
            if (backdrop) backdrop.classList.toggle("active");
        });
    }

    if (backdrop && sidebar) {
        backdrop.addEventListener("click", () => {
            sidebar.classList.remove("sidebar-open");
            backdrop.classList.remove("active");
        });
    }

    // Admin logout
    const logoutBtn = document.getElementById("admin-logout-btn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => logoutUser("login.html"));
    }
}

/**
 * Dashboard specific statistics and recent records loading
 */
async function initAdminDashboard() {
    const statsAlumni = document.getElementById("stat-total-alumni");
    const statsEvents = document.getElementById("stat-total-events");
    const statsJobs = document.getElementById("stat-total-jobs");
    const statsAnnouncements = document.getElementById("stat-total-announcements");
    const statsFeedback = document.getElementById("stat-total-feedback");

    try {
        // Load counts in parallel from real Firestore collections
        const [alumniSnap, eventsSnap, jobsSnap, annSnap, fbSnap] = await Promise.all([
            getDocs(collection(db, "alumni")),
            getDocs(collection(db, "events")),
            getDocs(collection(db, "jobs")),
            getDocs(collection(db, "announcements")),
            getDocs(collection(db, "feedback"))
        ]);

        if (statsAlumni) statsAlumni.textContent = alumniSnap.size;
        if (statsEvents) statsEvents.textContent = eventsSnap.size;
        if (statsJobs) statsJobs.textContent = jobsSnap.size;
        if (statsAnnouncements) statsAnnouncements.textContent = annSnap.size;
        if (statsFeedback) statsFeedback.textContent = fbSnap.size;

        // Load recent alumni table
        const recentAlumniTable = document.getElementById("recent-alumni-table-body");
        if (recentAlumniTable) {
            if (alumniSnap.empty) {
                recentAlumniTable.innerHTML = `<tr><td colspan="5" class="text-center text-muted" style="padding: 2rem;">No registered alumni yet.</td></tr>`;
            } else {
                let rows = "";
                const recent = alumniSnap.docs.slice(0, 5);
                recent.forEach((d) => {
                    const a = d.data();
                    rows += `
                        <tr>
                            <td>
                                <div class="table-user-cell">
                                    <img src="${a.profileImage || 'assets/images/avatar-default.svg'}" class="table-avatar" onerror="this.src='assets/images/avatar-default.svg'">
                                    <strong>${escapeHtml(a.name || "N/A")}</strong>
                                </div>
                            </td>
                            <td>${escapeHtml(a.email || "N/A")}</td>
                            <td>${escapeHtml(a.department || "N/A")}</td>
                            <td>${escapeHtml(a.graduationYear || "N/A")}</td>
                            <td>${escapeHtml(a.company || "N/A")}</td>
                        </tr>
                    `;
                });
                recentAlumniTable.innerHTML = rows;
            }
        }

        // Load recent events
        const recentEventsContainer = document.getElementById("recent-events-list");
        if (recentEventsContainer) {
            if (eventsSnap.empty) {
                renderEmpty(recentEventsContainer, "No events currently added.");
            } else {
                let html = '<div style="display: flex; flex-direction: column; gap: 0.75rem;">';
                eventsSnap.docs.slice(0, 4).forEach((d) => {
                    const ev = d.data();
                    html += `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; border-radius: var(--radius-sm); background: var(--bg-alt);">
                            <div>
                                <h5 style="margin: 0; font-size: 0.95rem;">${escapeHtml(ev.title)}</h5>
                                <span class="text-muted" style="font-size: 0.8rem;">📍 ${escapeHtml(ev.venue || "Campus")}</span>
                            </div>
                            <span class="badge badge-primary">📅 ${escapeHtml(ev.date || "TBA")}</span>
                        </div>
                    `;
                });
                html += '</div>';
                recentEventsContainer.innerHTML = html;
            }
        }

    } catch (error) {
        console.error("Failed to load admin statistics:", error);
    }
}
