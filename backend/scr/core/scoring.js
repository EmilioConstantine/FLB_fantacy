// src/core/scoring.js

// We keep the same weights as in PHP admin_add_stats.php:
//
// $score = $points
//        + 1.2 * $rebounds
//        + 1.5 * $assists
//        + 3   * $steals
//        + 3   * $blocks
//        - 1   * $turnovers;
//
// return (int) round($score);

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
 *
 * stats shape (can come from DB weekly_stats or a plain object):
 *   {
 *     points,
 *     rebounds,
 *     assists,
 *     steals,
 *     blocks,
 *     turnovers
 *   }
 *
 * Returns an integer, same as PHP.
 */
function calculatePlayerFantasyPoints(stats = {}) {
  const p  = Number(stats.points    || 0);
  const r  = Number(stats.rebounds  || 0);
  const a  = Number(stats.assists   || 0);
  const s  = Number(stats.steals    || 0);
  const b  = Number(stats.blocks    || 0);
  const to = Number(stats.turnovers || 0);

  const score =
    p  * SCORING.points   +
    r  * SCORING.rebounds +
    a  * SCORING.assists  +
    s  * SCORING.steals   +
    b  * SCORING.blocks   +
    to * SCORING.turnovers;

  // EXACT mirror of PHP: (int) round($score)
  return Math.round(score);
}

/**
 * Coach bonus points.
 *
 * coachRow shape (from DB "coaches"):
 *   { id, name, team, price, bonus_points }
 */
function calculateCoachBonus(coachRow) {
  if (!coachRow) return 0;
  return Number(coachRow.bonus_points || 0);
}

module.exports = {
  SCORING,
  calculatePlayerFantasyPoints,
  calculateCoachBonus
};
