// frontend/admin/js/admin-dashboard.js
import * as LbMod from "../../backend/scr/api/leaderboardService.js";
import * as ScoreMod from "../../backend/scr/api/scoringService.js";

const LeaderboardService =
  LbMod.LeaderboardService || LbMod.default || LbMod;
const ScoringService = ScoreMod.ScoringService || ScoreMod.default || ScoreMod;

function log(msg) {
  const box = document.getElementById("admin-log");
  box.textContent += msg + "\n";
  box.scrollTop = box.scrollHeight;
}

function getWeek() {
  const n = parseInt(document.getElementById("admin-week").value, 10);
  return Number.isNaN(n) ? 1 : n;
}

function renderTeamsTable(res) {
  const container = document.getElementById("teams-table");
  container.innerHTML = "";

  if (!res.success || !res.teams || !res.teams.length) {
    container.textContent = "No teams.";
    return;
  }

  const table = document.createElement("table");
  table.className = "w-full text-left border-collapse";

  const thead = document.createElement("thead");
  thead.innerHTML = `
    <tr class="bg-gray-50">
      <th class="px-2 py-1 border text-[11px]">User</th>
      <th class="px-2 py-1 border text-[11px]">Team</th>
      <th class="px-2 py-1 border text-[11px]">Week</th>
      <th class="px-2 py-1 border text-[11px]">Players</th>
      <th class="px-2 py-1 border text-[11px]">Coach</th>
      <th class="px-2 py-1 border text-[11px]">Cost</th>
      <th class="px-2 py-1 border text-[11px]">Budget left</th>
    </tr>`;
  table.appendChild(thead);

  const tbody = document.createElement("tbody");

  res.teams.forEach((t) => {
    const tr = document.createElement("tr");
    tr.className = "border-t";

    const playersNames = (t.players || [])
      .map((p) => (p.is_captain ? `${p.name} (C)` : p.name))
      .join(", ");

    const coachName = t.coach ? t.coach.name : "-";

    tr.innerHTML = `
      <td class="px-2 py-1 border">${t.user.username} (#${t.user.id})</td>
      <td class="px-2 py-1 border">${t.team_name}</td>
      <td class="px-2 py-1 border">${t.week_number}</td>
      <td class="px-2 py-1 border">${playersNames}</td>
      <td class="px-2 py-1 border">${coachName}</td>
      <td class="px-2 py-1 border">${t.total_cost}</td>
      <td class="px-2 py-1 border">${t.user.budget_remaining}</td>
    `;
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  container.appendChild(table);
}

function attachHandlers() {
  document
    .getElementById("btn-run-scoring")
    .addEventListener("click", async () => {
      const week = getWeek();
      log(`Running admin_run_weekly_scoring.php for week ${week}...`);
      try {
        const res = await ScoringService.runWeeklyScoring(week);
        log(JSON.stringify(res));
      } catch (err) {
        log("Error: " + err.message);
      }
    });

  document.getElementById("btn-recalc").addEventListener("click", async () => {
    const week = getWeek();
    log(`Running team/update_team.php for week ${week}...`);
    try {
      const res = await ScoringService.recalcWeekFromTeams(week);
      log(JSON.stringify(res));
    } catch (err) {
      log("Error: " + err.message);
    }
  });

  document
    .getElementById("btn-load-teams")
    .addEventListener("click", async () => {
      const week = getWeek();
      log(`Loading teams for week ${week}...`);
      try {
        const res = await LeaderboardService.getTeamsForWeek(week);
        renderTeamsTable(res);
      } catch (err) {
        log("Error: " + err.message);
      }
    });

  document
    .getElementById("btn-price-single")
    .addEventListener("click", async () => {
      const id = parseInt(
        document.getElementById("price-player-id").value,
        10
      );
      const newPrice = parseInt(
        document.getElementById("price-new").value,
        10
      );
      if (!id || !newPrice) {
        alert("Enter player id and new price");
        return;
      }
      log(`Updating price of player #${id} → ${newPrice}`);
      try {
        const res = await ScoringService.updateSinglePlayerPrice(
          id,
          newPrice
        );
        log(JSON.stringify(res));
      } catch (err) {
        log("Error: " + err.message);
      }
    });
}

document.addEventListener("DOMContentLoaded", attachHandlers);
