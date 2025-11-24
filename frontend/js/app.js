// --- DATA ---
const TEAMS = {
    RIY: { name: "Al Riyadi", color: "#FDB913" },
    SAG: { name: "Sagesse", color: "#006633" },
    BEI: { name: "Beirut", color: "#582C83" },
    HOM: { name: "Homenetmen", color: "#F05A28" },
};

const PLAYERS_DB = [
    { id: 1, name: "Wael Arakji", team: "RIY", pos: "PG", price: 14.5 },
    { id: 2, name: "Ali Mezher", team: "SAG", pos: "PG", price: 9.8 },
    { id: 3, name: "Jad Khalil", team: "HOM", pos: "PG", price: 8.5 },

    { id: 4, name: "Sergio El Darwich", team: "BEI", pos: "SG", price: 13.2 },
    { id: 5, name: "Amir Saoud", team: "RIY", pos: "SG", price: 11.8 },

    { id: 6, name: "Ahmad Ibrahim", team: "SAG", pos: "SF", price: 12.5 },
    { id: 7, name: "Karim Zeinoun", team: "RIY", pos: "SF", price: 10.5 },

    { id: 8, name: "Hayk Gyokchyan", team: "RIY", pos: "PF", price: 12.8 },
    { id: 9, name: "Karim Ezzeddine", team: "SAG", pos: "PF", price: 11.5 },

    { id: 10, name: "Elmedin Kikanovic", team: "RIY", pos: "C", price: 15.0 },
    { id: 11, name: "Gerard Hadidian", team: "BEI", pos: "C", price: 11.0 },

    // Coaches
    { id: 100, name: "Joe Vogel", team: "RIY", pos: "COACH", price: 8.0 },
    { id: 101, name: "Fadi El Khatib", team: "SAG", pos: "COACH", price: 7.5 },
];

// --- STATE ---
let currentTeam = {
    PG: null,
    SG: null,
    SF: null,
    PF: null,
    C: null,
    COACH: null,
};

let budget = 100.0;
let selectingPos = null;

// --- HELPERS ---
function formatPrice(p) {
    return p.toFixed(1);
}

// Shorten name to fit inside circle (last name, max 7 chars)
function shortName(fullName) {
    const parts = fullName.split(" ");
    const last = parts[parts.length - 1] || fullName;
    return last.length > 7 ? last.slice(0, 7) : last;
}

// --- MODAL LOGIC ---
function openPlayerModal(pos) {
    selectingPos = pos;

    const modal = document.getElementById("player-selection-area");
    const posLabel = document.getElementById("selecting-pos");
    const container = document.getElementById("players-list-container");

    posLabel.innerText = pos === "COACH" ? "Coach" : pos;
    container.innerHTML = "";

    const eligiblePlayers = PLAYERS_DB.filter((p) => p.pos === pos);

    eligiblePlayers.forEach((player) => {
        const row = document.createElement("div");
        row.className = "player-item border-b border-gray-100";

        row.innerHTML = `
            <div class="flex flex-col">
                <span class="font-semibold text-sm text-gray-800">
                    ${player.name}
                </span>
                <span class="text-xs text-gray-500">
                    ${TEAMS[player.team]?.name || player.team} • $${formatPrice(player.price)}M
                </span>
            </div>
            <button class="btn-primary text-xs px-3 py-1" onclick="selectPlayer(${player.id})">
                Select
            </button>
        `;

        container.appendChild(row);
    });

    modal.classList.remove("hidden");
}

function closePlayerModal() {
    const modal = document.getElementById("player-selection-area");
    modal.classList.add("hidden");
}

// --- SELECT PLAYER ---
function selectPlayer(playerId) {
    const player = PLAYERS_DB.find((p) => p.id === playerId);
    if (!player || !selectingPos) return;

    // Already filled?
    if (currentTeam[selectingPos]) {
        alert("This position is already filled.");
        return;
    }

    // Budget check
    if (budget < player.price) {
        alert("You don't have enough budget.");
        return;
    }

    currentTeam[selectingPos] = player;
    budget -= player.price;

    updateUI();
    closePlayerModal();
}

// --- UPDATE UI ---
function updateUI() {
    // Update markers
    Object.keys(currentTeam).forEach((pos) => {
        const player = currentTeam[pos];
        const circle = document.getElementById(`name-${pos}`); // jersey-icon div

        if (!circle) return;

        circle.classList.remove("filled-marker", "empty-marker", "coach-filled");
        circle.style.backgroundColor = ""; // allow CSS to handle defaults

        if (player) {
            // Text inside circle
            circle.textContent =
                pos === "COACH" ? "COACH" : shortName(player.name);

            circle.classList.add("filled-marker");

            if (pos === "COACH") {
                circle.classList.add("coach-filled");
            }
        } else {
            // Empty state
            circle.textContent = pos === "COACH" ? "COACH" : pos;
            circle.classList.add("empty-marker");
        }
    });

    // Update budget
    const budgetEl = document.getElementById("budget-display");
    if (budgetEl) {
        budgetEl.textContent = budget.toFixed(1);
    }
}

// --- SAVE TEAM ---
function saveTeam() {
    const selectedCount = Object.values(currentTeam).filter(Boolean).length;
    if (selectedCount < 6) {
        alert("Please select 5 players + 1 coach.");
        return;
    }

    localStorage.setItem("flb_myTeam", JSON.stringify(currentTeam));
    localStorage.setItem("flb_budget", budget.toString());
    alert("Team saved successfully. Good luck this gameweek!");
}

// --- AUTO FILL TEAM ---
function autoFillTeam() {
    // Reset
    budget = 100.0;
    currentTeam = { PG: null, SG: null, SF: null, PF: null, C: null, COACH: null };

    const positions = ["PG", "SG", "SF", "PF", "C", "COACH"];

    positions.forEach((pos) => {
        const playersForPos = PLAYERS_DB
            .filter((p) => p.pos === pos)
            .sort((a, b) => a.price - b.price); // cheapest first

        for (const p of playersForPos) {
            if (budget >= p.price && !currentTeam[pos]) {
                currentTeam[pos] = p;
                budget -= p.price;
                break;
            }
        }
    });

    updateUI();
}

function resetTeam() {
    // Reset data
    budget = 100.0;
    currentTeam = { PG: null, SG: null, SF: null, PF: null, C: null, COACH: null };

    // Reset UI circles
    const positions = ["PG", "SG", "SF", "PF", "C", "COACH"];
    positions.forEach(pos => {
        const circle = document.getElementById(`name-${pos}`);
        if (circle) {
            circle.classList.remove("filled-marker", "coach-filled");
            circle.textContent = pos === "COACH" ? "COACH" : pos;
            circle.classList.add("empty-marker");
        }
    });

    // Clear saved data
    localStorage.removeItem("flb_myTeam");
    localStorage.removeItem("flb_budget");

    updateUI();
}

// --- LOAD FROM STORAGE (optional if you used save before) ---
function loadFromStorage() {
    try {
        const storedTeam = localStorage.getItem("flb_myTeam");
        const storedBudget = localStorage.getItem("flb_budget");

        if (storedTeam) currentTeam = JSON.parse(storedTeam);
        if (storedBudget) budget = parseFloat(storedBudget);
    } catch (e) {
        console.warn("Failed to load saved team:", e);
    }
}

// --- INIT ---
window.addEventListener("DOMContentLoaded", () => {
    loadFromStorage();
    updateUI();
});