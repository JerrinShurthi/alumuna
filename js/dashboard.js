// =============================================================================
// Alumni Dashboard Controller
// =============================================================================

import { checkAuthState, logoutUser, getUserProfile } from "./auth.js";
import { calculateProfileCompletion, formatDate, renderLoading, renderEmpty, escapeHtml } from "./utils.js";
import { db } from "./firebase-config.js";
import { collection, getDocs, query, limit, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
    // Route guard: only authenticated alumni (or admin) can access
    checkAuthState({
        allowAnonymous: false,
        onUserReady: async (user, role, userData) => {
            initDashboard(user);
        }
    });

    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => logoutUser());
    }
});

async function initDashboard(user) {
    if (!user) return;

    try {
        const { user: userRecord, alumni: alumniRecord } = await getUserProfile(user.uid);
        const profile = alumniRecord || { name: user.displayName || user.email.split("@")[0] };

        // 1. Update Welcome Banner
        const greetingEl = document.getElementById("dash-user-name");
        const avatarEl = document.getElementById("dash-user-avatar");
        const detailsEl = document.getElementById("dash-user-subtext");

        if (greetingEl) greetingEl.textContent = profile.name || "Alumni Member";
        if (avatarEl && profile.profileImage) avatarEl.src = profile.profileImage;
        if (detailsEl) {
            const grad = profile.graduationYear ? `Class of ${profile.graduationYear}` : "";
            const dept = profile.department ? ` • ${profile.department}` : "";
            const role = profile.jobPosition && profile.company ? ` | ${profile.jobPosition} at ${profile.company}` : "";
            detailsEl.textContent = `${grad}${dept}${role}`.trim() || "Welcome to your alumni community!";
        }

        // 2. Profile Completion Bar
        const completionPct = calculateProfileCompletion(profile);
        const pctEl = document.getElementById("profile-completion-pct");
        const barEl = document.getElementById("profile-completion-bar");
        const tipEl = document.getElementById("profile-completion-tip");

        if (pctEl) pctEl.textContent = `${completionPct}%`;
        if (barEl) {
            setTimeout(() => {
                barEl.style.width = `${completionPct}%`;
            }, 100);
        }
        if (tipEl) {
            if (completionPct === 100) {
                tipEl.textContent = "Awesome! Your profile is 100% complete.";
            } else {
                tipEl.textContent = `Tip: Add missing details like Bio, LinkedIn, and Company in 'My Profile' to reach 100%.`;
            }
        }

        // 3. Load dynamic summary data for events, jobs, announcements
        loadDashboardPreviews();

    } catch (err) {
        console.error("Dashboard initialization error:", err);
    }
}

async function loadDashboardPreviews() {
    // Recent events preview
    const eventsContainer = document.getElementById("dash-events-preview");
    if (eventsContainer) {
        renderLoading(eventsContainer, "Loading events...");
        try {
            const snap = await getDocs(query(collection(db, "events"), limit(3)));
            if (snap.empty) {
                renderEmpty(eventsContainer, "No upcoming events scheduled right now.");
            } else {
                let html = '<div class="grid-3">';
                snap.forEach(docSnap => {
                    const e = docSnap.data();
                    html += `
                        <div class="card event-card">
                            <div class="event-card-body">
                                <span class="event-date-badge">${escapeHtml(e.date || "Upcoming")}</span>
                                <h4 class="event-title">${escapeHtml(e.title || "Event")}</h4>
                                <p class="event-desc">${escapeHtml(e.description || "")}</p>
                                <div class="event-meta-list">
                                    <div class="event-meta-item">
                                        <span>📍 ${escapeHtml(e.venue || "Campus")}</span>
                                    </div>
                                    <div class="event-meta-item">
                                        <span>⏰ ${escapeHtml(e.time || "TBA")}</span>
                                    </div>
                                </div>
                                <a href="events.html" class="btn btn-outline-primary btn-sm">View Event</a>
                            </div>
                        </div>
                    `;
                });
                html += '</div>';
                eventsContainer.innerHTML = html;
            }
        } catch (error) {
            console.error("Error loading events preview:", error);
            renderEmpty(eventsContainer, "Unable to load events.");
        }
    }

    // Recent announcements preview
    const annContainer = document.getElementById("dash-announcements-preview");
    if (annContainer) {
        renderLoading(annContainer, "Loading announcements...");
        try {
            const snap = await getDocs(query(collection(db, "announcements"), limit(3)));
            if (snap.empty) {
                renderEmpty(annContainer, "No recent announcements.");
            } else {
                let html = '<div style="display: flex; flex-direction: column; gap: 1rem;">';
                snap.forEach(docSnap => {
                    const a = docSnap.data();
                    html += `
                        <div class="card announcement-card ${a.isImportant ? 'important' : ''}">
                            <div class="announcement-header">
                                <h4 class="announcement-title">${escapeHtml(a.title)}</h4>
                                ${a.isImportant ? '<span class="badge badge-warning">Important</span>' : ''}
                            </div>
                            <p class="announcement-desc">${escapeHtml(a.description)}</p>
                            <span class="text-muted" style="font-size: 0.8rem; margin-top: 0.5rem;">📅 ${escapeHtml(a.date || "")}</span>
                        </div>
                    `;
                });
                html += '</div>';
                annContainer.innerHTML = html;
            }
        } catch (error) {
            console.error("Error loading announcements preview:", error);
            renderEmpty(annContainer, "Unable to load announcements.");
        }
    }
}
