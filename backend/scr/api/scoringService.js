// backend/scr/api/scoringService.js
import { LeaderboardService } from "./leaderboardService.js";

export const ScoringService = {
  runWeeklyScoring: LeaderboardService.runWeeklyScoring,
  recalcWeekFromTeams: LeaderboardService.recalcWeekFromTeams,
  updatePlayerPricesBatch: LeaderboardService.updatePlayerPricesBatch,
  updateSinglePlayerPrice: LeaderboardService.updateSinglePlayerPrice,
  getTeamsForWeek: LeaderboardService.getTeamsForWeek,
};

export default ScoringService;
