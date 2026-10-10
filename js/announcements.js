// =============================================================================
// Announcements Controller
// =============================================================================

import { checkAuthState } from "./auth.js";
import { renderLoading, renderEmpty, escapeHtml, formatDate } from "./utils.js";
import { db } from "./firebase-config.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
    checkAuthState({ allowAnonymous: true });
    loadAnnouncements();
});

async function loadAnnouncements() {
    const container = document.getElementById("announcements-container");
    if (!container) return;

    renderLoading(container, "Loading official announcements...");

    try {
        const snap = await getDocs(collection(db, "announcements"));
        const announcements = [];
        snap.forEach((docSnap) => {
            announcements.push({ id: docSnap.id, ...docSnap.data() });
        });

        // Sort so important announcements appear at the top, then newest date
        announcements.sort((a, b) => {
            if (a.isImportant && !b.isImportant) return -1;
            if (!a.isImportant && b.isImportant) return 1;
            return new Date(b.date || 0) - new Date(a.date || 0);
        });

        renderAnnouncementsList(announcements);

    } catch (error) {
        console.error("Error loading announcements:", error);
        renderEmpty(container, "Unable to load announcements from the database.");
    }
}

function renderAnnouncementsList(list) {
    const container = document.getElementById("announcements-container");
    if (!container) return;

    if (list.length === 0) {
        renderEmpty(container, "No announcements posted at this time.");
        return;
    }

    container.innerHTML = "";
    const listWrapper = document.createElement("div");
    listWrapper.style.display = "flex";
    listWrapper.style.flexDirection = "column";
    listWrapper.style.gap = "1.5rem";

    list.forEach((item) => {
        const card = document.createElement("div");
        card.className = `card announcement-card ${item.isImportant ? "important" : ""}`;

        card.innerHTML = `
            <div class="announcement-header">
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <span style="font-size: 1.25rem;">📢</span>
                    <h3 class="announcement-title" style="margin: 0;">${escapeHtml(item.title)}</h3>
                </div>
                ${item.isImportant ? `<span class="badge badge-warning">Important Notice</span>` : ""}
            </div>

            <p class="announcement-desc">${escapeHtml(item.description)}</p>

            <div style="margin-top: 1rem; padding-top: 0.75rem; border-top: 1px solid var(--border); font-size: 0.85rem; color: var(--text-muted);">
                📅 Posted on: ${escapeHtml(item.date || "Recent")}
            </div>
        `;

        listWrapper.appendChild(card);
    });

    container.appendChild(listWrapper);
}
