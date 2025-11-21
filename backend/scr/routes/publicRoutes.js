// src/routes/publicRoutes.js

const express = require('express');
const router = express.Router();

const dataSource = require('../data/dataSource');
const { getLeaderboardWithRanks } = require('../core/leaderboardService');

// GET /api/leaderboard
router.get('/leaderboard', async (req, res, next) => {
  try {
    const leaderboard = await getLeaderboardWithRanks(100, dataSource);
    res.json(leaderboard);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
