// =============================================================================
// Alumni Directory Controller
// =============================================================================

import { checkAuthState } from "./auth.js";
import { renderLoading, renderEmpty, escapeHtml } from "./utils.js";
import { db } from "./firebase-config.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let allAlumni = [];

document.addEventListener("DOMContentLoaded", () => {
    // Check auth state for public navbar handling
    checkAuthState({ allowAnonymous: true });

    loadAlumniDirectory();
    setupFilters();
    setupViewModal();
});

async function loadAlumniDirectory() {
    const container = document.getElementById("alumni-grid");
    if (!container) return;

    renderLoading(container, "Loading alumni directory...");

    try {
        const alumniCollection = collection(db, "alumni");
        const querySnapshot = await getDocs(alumniCollection);

        allAlumni = [];
        querySnapshot.forEach((docSnap) => {
            allAlumni.push({ id: docSnap.id, ...docSnap.data() });
        });

        // Populate dynamic filter options from loaded data
        populateFilterDropdowns(allAlumni);
        renderAlumniList(allAlumni);

    } catch (error) {
        console.error("Error loading alumni directory:", error);
        renderEmpty(container, "Unable to load alumni records from database. Please ensure Firestore is initialized.");
    }
}

function renderAlumniList(alumniList) {
    const container = document.getElementById("alumni-grid");
    const countEl = document.getElementById("alumni-count-badge");
    if (!container) return;

    if (countEl) countEl.textContent = `${alumniList.length} Alumni Found`;

    if (alumniList.length === 0) {
        renderEmpty(container, "No alumni matched your search criteria.");
        return;
    }

    container.innerHTML = "";
    const grid = document.createElement("div");
    grid.className = "grid-3";

    alumniList.forEach((alumnus) => {
        const card = document.createElement("div");
        card.className = "card alumni-card";

        const imgUrl = alumnus.profileImage || "assets/images/avatar-default.svg";
        const role = alumnus.jobPosition || "Alumni Member";
        const comp = alumnus.company ? `@ ${alumnus.company}` : "";
        const locationText = alumnus.location ? `📍 ${escapeHtml(alumnus.location)}` : "";

        card.innerHTML = `
            <div class="alumni-avatar-wrapper">
                <img src="${imgUrl}" alt="${escapeHtml(alumnus.name)}" class="alumni-avatar" onerror="this.src='assets/images/avatar-default.svg'">
            </div>
            <h3 class="alumni-name">${escapeHtml(alumnus.name || "Alumni")}</h3>
            <p class="alumni-role">${escapeHtml(role)}</p>
            <p class="alumni-company">${escapeHtml(comp)}</p>
            
            <div class="alumni-tags">
                ${alumnus.department ? `<span class="alumni-tag">${escapeHtml(alumnus.department)}</span>` : ""}
                ${alumnus.graduationYear ? `<span class="alumni-tag">Class of ${escapeHtml(alumnus.graduationYear)}</span>` : ""}
                ${alumnus.degree ? `<span class="alumni-tag">${escapeHtml(alumnus.degree)}</span>` : ""}
            </div>

            ${locationText ? `<p class="alumni-location">${locationText}</p>` : ""}

            <div style="margin-top: auto; width: 100%;">
                <button type="button" class="btn btn-outline-primary btn-sm btn-block view-profile-btn" data-id="${alumnus.id}">
                    View Full Profile
                </button>
            </div>
        `;

        grid.appendChild(card);
    });

    container.appendChild(grid);

    // Attach click handlers to view buttons
    container.querySelectorAll(".view-profile-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            const alumnusId = btn.dataset.id;
            const alumnus = allAlumni.find((a) => a.id === alumnusId);
            if (alumnus) openProfileModal(alumnus);
        });
    });
}

function populateFilterDropdowns(list) {
    const deptSelect = document.getElementById("filter-department");
    const yearSelect = document.getElementById("filter-year");
    const degreeSelect = document.getElementById("filter-degree");

    const departments = new Set();
    const years = new Set();
    const degrees = new Set();

    list.forEach((item) => {
        if (item.department) departments.add(item.department);
        if (item.graduationYear) years.add(item.graduationYear);
        if (item.degree) degrees.add(item.degree);
    });

    if (deptSelect && deptSelect.options.length <= 1) {
        [...departments].sort().forEach((d) => {
            deptSelect.add(new Option(d, d));
        });
    }

    if (yearSelect && yearSelect.options.length <= 1) {
        [...years].sort((a, b) => b - a).forEach((y) => {
            yearSelect.add(new Option(y, y));
        });
    }

    if (degreeSelect && degreeSelect.options.length <= 1) {
        [...degrees].sort().forEach((deg) => {
            degreeSelect.add(new Option(deg, deg));
        });
    }
}

function setupFilters() {
    const searchInput = document.getElementById("search-input");
    const deptSelect = document.getElementById("filter-department");
    const yearSelect = document.getElementById("filter-year");
    const degreeSelect = document.getElementById("filter-degree");
    const resetBtn = document.getElementById("reset-filters-btn");

    const applyFilters = () => {
        const query = (searchInput ? searchInput.value : "").trim().toLowerCase();
        const selDept = deptSelect ? deptSelect.value : "";
        const selYear = yearSelect ? yearSelect.value : "";
        const selDegree = degreeSelect ? degreeSelect.value : "";

        const filtered = allAlumni.filter((a) => {
            // Text search matches name, company, or location
            const matchesSearch = !query ||
                (a.name && a.name.toLowerCase().includes(query)) ||
                (a.company && a.company.toLowerCase().includes(query)) ||
                (a.location && a.location.toLowerCase().includes(query));

            const matchesDept = !selDept || a.department === selDept;
            const matchesYear = !selYear || String(a.graduationYear) === String(selYear);
            const matchesDegree = !selDegree || a.degree === selDegree;

            return matchesSearch && matchesDept && matchesYear && matchesDegree;
        });

        renderAlumniList(filtered);
    };

    if (searchInput) searchInput.addEventListener("input", applyFilters);
    if (deptSelect) deptSelect.addEventListener("change", applyFilters);
    if (yearSelect) yearSelect.addEventListener("change", applyFilters);
    if (degreeSelect) degreeSelect.addEventListener("change", applyFilters);

    if (resetBtn) {
        resetBtn.addEventListener("click", () => {
            if (searchInput) searchInput.value = "";
            if (deptSelect) deptSelect.value = "";
            if (yearSelect) yearSelect.value = "";
            if (degreeSelect) degreeSelect.value = "";
            renderAlumniList(allAlumni);
        });
    }
}

function setupViewModal() {
    const modal = document.getElementById("alumni-detail-modal");
    const closeBtn = document.getElementById("close-alumni-detail-modal");
    if (!modal) return;

    const closeModal = () => modal.classList.remove("active");
    if (closeBtn) closeBtn.addEventListener("click", closeModal);
    modal.addEventListener("click", (e) => {
        if (e.target === modal) closeModal();
    });
}

function openProfileModal(a) {
    const modal = document.getElementById("alumni-detail-modal");
    if (!modal) return;

    document.getElementById("modal-avatar").src = a.profileImage || "assets/images/avatar-default.svg";
    document.getElementById("modal-name").textContent = a.name || "Alumni";
    document.getElementById("modal-headline").textContent = `${a.jobPosition || "Alumni"} at ${a.company || "Independent"}`;
    document.getElementById("modal-dept").textContent = a.department || "N/A";
    document.getElementById("modal-degree").textContent = a.degree || "N/A";
    document.getElementById("modal-year").textContent = a.graduationYear ? `Class of ${a.graduationYear}` : "N/A";
    document.getElementById("modal-location").textContent = a.location || "N/A";
    document.getElementById("modal-bio").textContent = a.bio || "No biography shared.";

    const linkedinBtn = document.getElementById("modal-linkedin");
    if (a.linkedin) {
        linkedinBtn.href = a.linkedin.startsWith("http") ? a.linkedin : `https://${a.linkedin}`;
        linkedinBtn.style.display = "inline-flex";
    } else {
        linkedinBtn.style.display = "none";
    }

    modal.classList.add("active");
}
