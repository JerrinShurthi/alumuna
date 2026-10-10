// =============================================================================
// Jobs / Career Opportunities Controller
// =============================================================================

import { checkAuthState } from "./auth.js";
import { renderLoading, renderEmpty, escapeHtml, formatDate } from "./utils.js";
import { db } from "./firebase-config.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let allJobs = [];

document.addEventListener("DOMContentLoaded", () => {
    checkAuthState({ allowAnonymous: true });
    loadJobs();
    setupJobFilters();
});

async function loadJobs() {
    const container = document.getElementById("jobs-container");
    if (!container) return;

    renderLoading(container, "Loading career opportunities...");

    try {
        const snap = await getDocs(collection(db, "jobs"));
        allJobs = [];
        snap.forEach((docSnap) => {
            allJobs.push({ id: docSnap.id, ...docSnap.data() });
        });

        renderJobsList(allJobs);
    } catch (error) {
        console.error("Error loading jobs:", error);
        renderEmpty(container, "Unable to load jobs from the database.");
    }
}

function renderJobsList(jobs) {
    const container = document.getElementById("jobs-container");
    const countEl = document.getElementById("jobs-count-badge");
    if (!container) return;

    if (countEl) countEl.textContent = `${jobs.length} Positions Available`;

    if (jobs.length === 0) {
        renderEmpty(container, "No job opportunities match your criteria.");
        return;
    }

    container.innerHTML = "";
    const grid = document.createElement("div");
    grid.className = "grid-2";

    jobs.forEach((job) => {
        const card = document.createElement("div");
        card.className = "card job-card";

        const applyUrl = job.applicationLink || "#";
        const hasExternalLink = applyUrl && applyUrl !== "#";

        card.innerHTML = `
            <div class="job-header">
                <div>
                    <h3 class="job-title">${escapeHtml(job.title)}</h3>
                    <div class="job-company">${escapeHtml(job.company)}</div>
                </div>
                <span class="job-type-badge">${escapeHtml(job.type || "Full-time")}</span>
            </div>

            <p class="job-desc">${escapeHtml(job.description || "")}</p>

            <div class="job-details">
                <div class="job-detail-item">
                    <span>📍 ${escapeHtml(job.location || "Remote / Onsite")}</span>
                </div>
                ${job.salary ? `
                    <div class="job-detail-item">
                        <span>💰 ${escapeHtml(job.salary)}</span>
                    </div>
                ` : ""}
                <div class="job-detail-item">
                    <span>📅 Posted: ${escapeHtml(job.postedDate || "Recently")}</span>
                </div>
            </div>

            <div style="margin-top: auto; display: flex; justify-content: flex-end;">
                ${hasExternalLink ? `
                    <a href="${escapeHtml(applyUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm">
                        Apply Now ↗
                    </a>
                ` : `
                    <button class="btn btn-primary btn-sm" onclick="alert('Please contact the hiring manager directly or check back for application details.');">
                        Apply Details
                    </button>
                `}
            </div>
        `;

        grid.appendChild(card);
    });

    container.appendChild(grid);
}

function setupJobFilters() {
    const searchInput = document.getElementById("job-search-input");
    const typeSelect = document.getElementById("job-type-filter");

    const applyFilter = () => {
        const query = (searchInput ? searchInput.value : "").trim().toLowerCase();
        const selType = typeSelect ? typeSelect.value : "";

        const filtered = allJobs.filter((j) => {
            const matchesQuery = !query ||
                (j.title && j.title.toLowerCase().includes(query)) ||
                (j.company && j.company.toLowerCase().includes(query)) ||
                (j.location && j.location.toLowerCase().includes(query));

            const matchesType = !selType || j.type === selType;

            return matchesQuery && matchesType;
        });

        renderJobsList(filtered);
    };

    if (searchInput) searchInput.addEventListener("input", applyFilter);
    if (typeSelect) typeSelect.addEventListener("change", applyFilter);
}
