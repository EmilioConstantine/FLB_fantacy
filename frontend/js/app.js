// --- DATA ---
const TEAMS = {
    'RIY': { name: 'Al Riyadi', color: '#FDB913' },
    'SAG': { name: 'Sagesse', color: '#006633' },
    'BEI': { name: 'Beirut', color: '#582C83' },
    'HOM': { name: 'Homenetmen', color: '#F05A28' }
};

const PLAYERS_DB = [
    { id: 1, name: 'Wael Arakji', team: 'RIY', pos: 'PG', price: 14.5 },
    { id: 2, name: 'Ali Mezher', team: 'SAG', pos: 'PG', price: 9.8 },
    { id: 3, name: 'Jad Khalil', team: 'HOM', pos: 'PG', price: 8.5 },
    { id: 4, name: 'Sergio El Darwich', team: 'BEI', pos: 'SG', price: 13.2 },
    { id: 5, name: 'Amir Saoud', team: 'RIY', pos: 'SG', price: 11.8 },
    { id: 6, name: 'Ahmad Ibrahim', team: 'SAG', pos: 'SF', price: 12.5 },
    { id: 7, name: 'Karim Zeinoun', team: 'RIY', pos: 'SF', price: 10.5 },
    { id: 8, name: 'Hayk Gyokchyan', team: 'RIY', pos: 'PF', price: 12.8 },
    { id: 9, name: 'Karim Ezzeddine', team: 'SAG', pos: 'PF', price: 11.5 },
    { id: 10, name: 'Elmedin Kikanovic', team: 'RIY', pos: 'C', price: 15.0 },
    { id: 11, name: 'Gerard Hadidian', team: 'BEI', pos: 'C', price: 11.0 }
];

// --- STATE ---
let currentTeam = { PG: null, SG: null, SF: null, PF: null, C: null }; // To keep track of selected team members
let budget = 100.0; // Default budget
let selectingPos = null; // The currently selected position

// --- FUNCTIONS ---

// Open Player Modal
function openPlayerModal(pos) {
    selectingPos = pos; // Store the selected position
    const modal = document.getElementById('player-selection-area');
    const posLabel = document.getElementById('selecting-pos');
    posLabel.innerText = pos; // Set the modal title to the selected position

    const container = document.getElementById('players-list-container');
    container.innerHTML = ''; // Clear any previously displayed players

    // Filter players for the selected position
    const eligiblePlayers = PLAYERS_DB.filter(player => player.pos === pos);

    // Display players for the selected position
    eligiblePlayers.forEach(player => {
        const playerElement = document.createElement('div');
        playerElement.className = 'player-item p-4 bg-white border-b border-gray-200';
        playerElement.innerHTML = `
            <div class="flex justify-between items-center">
                <span class="font-bold text-gray-800">${player.name} - $${player.price}M</span>
                <button class="btn-primary text-sm" onclick="selectPlayer(${player.id})">Select</button>
            </div>
        `;
        container.appendChild(playerElement);
    });

    // Show the modal
    modal.classList.remove('hidden');
}

// Close Player Modal
function closePlayerModal() {
    const modal = document.getElementById('player-selection-area');
    modal.classList.add('hidden'); // Hide the modal
}

// Select a player for the selected position
function selectPlayer(playerId) {
    const player = PLAYERS_DB.find(p => p.id === playerId); // Find the player by ID
    if (currentTeam[selectingPos]) {
        alert("This position is already filled!"); // If the position is already filled
        return;
    }

    // Check if the player can be selected based on the budget
    if (budget < player.price) {
        alert("You don't have enough budget!"); // If the user doesn't have enough budget
        return;
    }

    // Assign player to the selected position
    currentTeam[selectingPos] = player;
    budget -= player.price; // Deduct the player's price from the budget

    // Update the UI with the selected player
    updateUI();
    closePlayerModal(); // Close the player selection modal
}

// Update the UI with the selected players
function updateUI() {
    Object.keys(currentTeam).forEach(pos => {
        const player = currentTeam[pos];
        const markerName = document.getElementById(`name-${pos}`);
        const markerJersey = document.getElementById(`pos-${pos}`);

        if (player) {
            markerName.innerText = player.name.split(' ').pop(); // Display the player's last name
            markerJersey.innerText = player.team; // Display the player's team
            markerJersey.style.backgroundColor = TEAMS[player.team].color; // Set the team color
        } else {
            markerName.innerText = "Select"; // Default text when no player is selected
            markerJersey.innerText = pos; // Display the position
            markerJersey.style.backgroundColor = "#9CA3AF"; // Default gray background
        }
    });
}

// Save the team and proceed
function saveTeam() {
    const count = Object.values(currentTeam).filter(x => x).length; // Count how many players are selected
    if (count < 5) {
        alert("Please select all 5 players!"); // If the team is incomplete
    } else {
        // Save the team to LocalStorage
        localStorage.setItem('flb_myTeam', JSON.stringify(currentTeam));
        localStorage.setItem('flb_budget', budget.toString());
        alert("Team Saved Successfully! Good luck for Gameweek 14.");
    }
}

// Initialize on Page Load
window.addEventListener('DOMContentLoaded', () => {
    updateUI(); // Update the UI to reflect the current team state
});