// =============================================================================
// Events Directory Controller
// =============================================================================

import { checkAuthState, getCurrentUser } from "./auth.js";
import { renderLoading, renderEmpty, escapeHtml, showToast, formatDate } from "./utils.js";
import { db } from "./firebase-config.js";
import { collection, getDocs, orderBy, query } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let allEvents = [];

document.addEventListener("DOMContentLoaded", () => {
    checkAuthState({ allowAnonymous: true });
    loadEvents();
    setupEventModal();
});

async function loadEvents() {
    const container = document.getElementById("events-container");
    if (!container) return;

    renderLoading(container, "Loading upcoming alumni events...");

    try {
        const eventsCol = collection(db, "events");
        const snap = await getDocs(eventsCol);

        allEvents = [];
        snap.forEach((docSnap) => {
            allEvents.push({ id: docSnap.id, ...docSnap.data() });
        });

        // Sort by date if present
        allEvents.sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));

        renderEventsList(allEvents);

    } catch (error) {
        console.error("Error loading events:", error);
        renderEmpty(container, "Unable to load events from the database.");
    }
}

function renderEventsList(events) {
    const container = document.getElementById("events-container");
    if (!container) return;

    if (events.length === 0) {
        renderEmpty(container, "No events are currently scheduled. Please check back later.");
        return;
    }

    container.innerHTML = "";
    const grid = document.createElement("div");
    grid.className = "grid-3";

    events.forEach((ev) => {
        const card = document.createElement("div");
        card.className = "card event-card";

        const imgUrl = ev.imageUrl || "assets/images/event-placeholder.svg";

        card.innerHTML = `
            <img src="${imgUrl}" alt="${escapeHtml(ev.title)}" class="event-card-img" onerror="this.src='assets/images/event-placeholder.svg'">
            <div class="event-card-body">
                <span class="event-date-badge">📅 ${escapeHtml(ev.date || "Date TBA")}</span>
                <h3 class="event-title">${escapeHtml(ev.title)}</h3>
                <p class="event-desc">${escapeHtml(ev.description || "")}</p>
                <div class="event-meta-list">
                    <div class="event-meta-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                        <span>${escapeHtml(ev.time || "Time TBA")}</span>
                    </div>
                    <div class="event-meta-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                        <span>${escapeHtml(ev.venue || "Campus Venue")}</span>
                    </div>
                    <div class="event-meta-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                        <span>Organizer: ${escapeHtml(ev.organizer || "Alumni Association")}</span>
                    </div>
                </div>
                <div style="margin-top: auto; padding-top: 1rem;">
                    <button type="button" class="btn btn-primary btn-block btn-sm view-event-btn" data-id="${ev.id}">
                        Register & Details
                    </button>
                </div>
            </div>
        `;

        grid.appendChild(card);
    });

    container.appendChild(grid);

    container.querySelectorAll(".view-event-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            const ev = allEvents.find((e) => e.id === btn.dataset.id);
            if (ev) openEventModal(ev);
        });
    });
}

function setupEventModal() {
    const modal = document.getElementById("event-detail-modal");
    const closeBtn = document.getElementById("close-event-modal");
    const rsvpBtn = document.getElementById("rsvp-event-btn");

    if (!modal) return;
    const closeModal = () => modal.classList.remove("active");

    if (closeBtn) closeBtn.addEventListener("click", closeModal);
    modal.addEventListener("click", (e) => {
        if (e.target === modal) closeModal();
    });

    if (rsvpBtn) {
        rsvpBtn.addEventListener("click", () => {
            const user = getCurrentUser();
            if (!user) {
                showToast("Please log in to RSVP for this event.", "info");
                setTimeout(() => window.location.href = "login.html", 1200);
                return;
            }
            showToast("Registration confirmed! We look forward to seeing you.", "success");
            closeModal();
        });
    }
}

function openEventModal(ev) {
    const modal = document.getElementById("event-detail-modal");
    if (!modal) return;

    document.getElementById("modal-event-img").src = ev.imageUrl || "assets/images/event-placeholder.svg";
    document.getElementById("modal-event-title").textContent = ev.title;
    document.getElementById("modal-event-desc").textContent = ev.description || "";
    document.getElementById("modal-event-date").textContent = ev.date || "TBA";
    document.getElementById("modal-event-time").textContent = ev.time || "TBA";
    document.getElementById("modal-event-venue").textContent = ev.venue || "TBA";
    document.getElementById("modal-event-organizer").textContent = ev.organizer || "Alumni Association";

    modal.classList.add("active");
}
