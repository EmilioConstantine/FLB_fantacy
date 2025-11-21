// src/core/scoring.js

// You can tweak these later if you want different weights.
const SCORING = {
  points: 1,
  rebounds: 1.2,
  assists: 1.5,
  steals: 3,
  blocks: 3,
  turnovers: -1
};

/**
 * Calculate fantasy points for a player based on their weekly stats.
 * stats = { points, rebounds, assists, steals, blocks, turnovers }
 */
function calculatePlayerFantasyPoints(stats = {}) {
  const p = stats.points || 0;
  const r = stats.rebounds || 0;
  const a = stats.assists || 0;
  const s = stats.steals || 0;
  const b = stats.blocks || 0;
  const to = stats.turnovers || 0;

  const total =
    p * SCORING.points +
    r * SCORING.rebounds +
    a * SCORING.assists +
    s * SCORING.steals +
    b * SCORING.blocks +
    to * SCORING.turnovers;

  return Math.round(total * 10) / 10; // round to 1 decimal
}

/**
 * coachRow = { bonus_points }
 * For now we give the static bonus every week if the coach is selected.
 * Later you could make this depend on real wins.
 */
function calculateCoachBonus(coachRow) {
  if (!coachRow) return 0;
  const bonus = coachRow.bonus_points || 0;
  return bonus;
}

module.exports = {
  SCORING,
  calculatePlayerFantasyPoints,
  calculateCoachBonus
};
