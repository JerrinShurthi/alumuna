// =============================================================================
// Homepage Controller
// =============================================================================

import { checkAuthState } from "./auth.js";
import { escapeHtml, renderEmpty, renderLoading } from "./utils.js";
import { db } from "./firebase-config.js";
import { collection, getDocs, limit, query } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
    checkAuthState({ allowAnonymous: true });
    loadHomeData();
});

async function loadHomeData() {
    const heroAlumniCount = document.getElementById("hero-alumni-count");
    const heroEventsCount = document.getElementById("hero-events-count");
    const eventsContainer = document.getElementById("home-events-grid");
    const annContainer = document.getElementById("home-announcements-list");
    const alumniContainer = document.getElementById("home-featured-alumni");

    try {
        const [alumniSnap, eventsSnap, annSnap] = await Promise.all([
            getDocs(collection(db, "alumni")),
            getDocs(collection(db, "events")),
            getDocs(collection(db, "announcements"))
        ]);

        if (heroAlumniCount) heroAlumniCount.textContent = alumniSnap.size > 0 ? `${alumniSnap.size}+` : "500+";
        if (heroEventsCount) heroEventsCount.textContent = eventsSnap.size > 0 ? `${eventsSnap.size}+` : "25+";

        // Render upcoming events preview
        if (eventsContainer) {
            if (eventsSnap.empty) {
                renderEmpty(eventsContainer, "No events currently posted. Check back soon!");
            } else {
                let html = "";
                eventsSnap.docs.slice(0, 3).forEach((d) => {
                    const ev = d.data();
                    html += `
                        <div class="card event-card">
                            <img src="${ev.imageUrl || 'assets/images/event-placeholder.svg'}" class="event-card-img" alt="${escapeHtml(ev.title)}" onerror="this.src='assets/images/event-placeholder.svg'">
                            <div class="event-card-body">
                                <span class="event-date-badge">📅 ${escapeHtml(ev.date || "Upcoming")}</span>
                                <h3 class="event-title">${escapeHtml(ev.title)}</h3>
                                <p class="event-desc">${escapeHtml(ev.description || "")}</p>
                                <div class="event-meta-list">
                                    <div class="event-meta-item"><span>📍 ${escapeHtml(ev.venue || "Campus")}</span></div>
                                    <div class="event-meta-item"><span>⏰ ${escapeHtml(ev.time || "TBA")}</span></div>
                                </div>
                                <a href="events.html" class="btn btn-outline-primary btn-sm btn-block" style="margin-top: auto;">View Event Details</a>
                            </div>
                        </div>
                    `;
                });
                eventsContainer.innerHTML = html;
            }
        }

        // Render announcements preview
        if (annContainer) {
            if (annSnap.empty) {
                renderEmpty(annContainer, "No announcements at this time.");
            } else {
                let html = "";
                annSnap.docs.slice(0, 3).forEach((d) => {
                    const a = d.data();
                    html += `
                        <div class="card announcement-card ${a.isImportant ? 'important' : ''}" style="margin-bottom: 1rem;">
                            <div class="announcement-header">
                                <h4 class="announcement-title">${escapeHtml(a.title)}</h4>
                                ${a.isImportant ? '<span class="badge badge-warning">Important</span>' : ''}
                            </div>
                            <p class="announcement-desc">${escapeHtml(a.description)}</p>
                            <span class="text-muted" style="font-size: 0.82rem; margin-top: 0.5rem;">📅 ${escapeHtml(a.date || "")}</span>
                        </div>
                    `;
                });
                annContainer.innerHTML = html;
            }
        }

        // Render featured alumni preview
        if (alumniContainer) {
            if (alumniSnap.empty) {
                renderEmpty(alumniContainer, "Alumni directory is growing. Register today to be featured!");
            } else {
                let html = "";
                alumniSnap.docs.slice(0, 3).forEach((d) => {
                    const a = d.data();
                    html += `
                        <div class="card alumni-card">
                            <div class="alumni-avatar-wrapper">
                                <img src="${a.profileImage || 'assets/images/avatar-default.svg'}" alt="${escapeHtml(a.name)}" class="alumni-avatar" onerror="this.src='assets/images/avatar-default.svg'">
                            </div>
                            <h3 class="alumni-name">${escapeHtml(a.name)}</h3>
                            <p class="alumni-role">${escapeHtml(a.jobPosition || "Alumni")}</p>
                            <p class="alumni-company">${escapeHtml(a.company ? `@ ${a.company}` : "")}</p>
                            <div class="alumni-tags">
                                <span class="alumni-tag">${escapeHtml(a.department || "Engineering")}</span>
                                <span class="alumni-tag">Class of ${escapeHtml(a.graduationYear || "")}</span>
                            </div>
                            <a href="alumni.html" class="btn btn-outline-primary btn-sm" style="margin-top: 1rem;">View Directory</a>
                        </div>
                    `;
                });
                alumniContainer.innerHTML = html;
            }
        }

    } catch (err) {
        console.error("Home data load error:", err);
    }
}
