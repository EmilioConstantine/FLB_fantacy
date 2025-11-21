// src/routes/adminRoutes.js

const express = require('express');
const router = express.Router();

const requireAdmin = require('../middleware/requireAdmin');
const dataSource = require('../data/dataSource');
const { runWeeklyScoring } = require('../core/weeklyEngine');
const { getLeaderboardWithRanks } = require('../core/leaderboardService');

router.use(requireAdmin);

// POST /api/admin/players
router.post('/players', async (req, res, next) => {
  try {
    const { name, team, position, price } = req.body;
    const player = await dataSource.addPlayer({ name, team, position, price: Number(price) });
    res.json(player);
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/coaches
router.post('/coaches', async (req, res, next) => {
  try {
    const { name, team, price, bonus_points } = req.body;
    const coach = await dataSource.addCoach({
      name,
      team,
      price: Number(price),
      bonus_points: bonus_points != null ? Number(bonus_points) : undefined
    });
    res.json(coach);
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/weekly-stats
router.post('/weekly-stats', async (req, res, next) => {
  try {
    const stats = await dataSource.addOrUpdateWeeklyStats({
      player_id: Number(req.body.player_id),
      week_number: Number(req.body.week_number),
      points: Number(req.body.points || 0),
      rebounds: Number(req.body.rebounds || 0),
      assists: Number(req.body.assists || 0),
      steals: Number(req.body.steals || 0),
      blocks: Number(req.body.blocks || 0),
      turnovers: Number(req.body.turnovers || 0)
    });
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/calculate-week
router.post('/calculate-week', async (req, res, next) => {
  try {
    const weekNumber = Number(req.body.week_number);
    const result = await runWeeklyScoring(weekNumber, dataSource);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/teams
router.get('/teams', async (req, res, next) => {
  try {
    const teams = await dataSource.getAllUserTeamsDetailed();
    res.json(teams);
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/leaderboard (same as public but here too)
router.get('/leaderboard', async (req, res, next) => {
  try {
    const leaderboard = await getLeaderboardWithRanks(100, dataSource);
    res.json(leaderboard);
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/save-team (for testing the validation)
router.post('/save-team', async (req, res, next) => {
  try {
    const userId = Number(req.body.user_id);
    const playerIds = req.body.player_ids.map(Number);
    const coachId = Number(req.body.coach_id);

    const result = await dataSource.saveUserTeamWithValidation(
      userId,
      playerIds,
      coachId
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
