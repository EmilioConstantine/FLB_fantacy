// scr/tests/weeklyEngine.test.js

const { runWeeklyScoring } = require('../core/weeklyEngine');
const { calculatePlayerFantasyPoints } = require('../core/scoring');

describe('weeklyEngine.js – runWeeklyScoring', () => {
  test('calculates weekly points per user and calls dataSource methods', async () => {
    const weekNumber = 1;

    // --- Mock teams ---
    const teams = [
      {
        user_id: 1,
        username: 'jimmy',
        player1: 1,
        player2: 2,
        player3: 3,
        player4: null,
        player5: null,
        coach: 10
      },
      {
        user_id: 2,
        username: 'sara',
        player1: 2,
        player2: 3,
        player3: null,
        player4: null,
        player5: null,
        coach: 11
      }
    ];

    // --- Mock stats for week 1 ---
    const playerStatsRows = [
      { player_id: 1, week_number: 1, points: 10, rebounds: 5, assists: 2, steals: 1, blocks: 0, turnovers: 1 },
      { player_id: 2, week_number: 1, points: 20, rebounds: 3, assists: 4, steals: 0, blocks: 1, turnovers: 2 },
      { player_id: 3, week_number: 1, points: 15, rebounds: 7, assists: 1, steals: 2, blocks: 1, turnovers: 3 }
    ];

    // --- Mock coaches ---
    const coaches = [
      { id: 10, name: 'Coach A', bonus_points: 5 },
      { id: 11, name: 'Coach B', bonus_points: 3 }
    ];

    // --- Mock dataSource implementation ---
    const saved = [];
    let recomputeCalled = false;

    const dataSource = {
      async getAllUserTeams() {
        return teams;
      },
      async getWeeklyStatsForPlayers(week, playerIds) {
        expect(week).toBe(weekNumber);
        expect(playerIds.sort()).toEqual([1, 2, 3]);
        return playerStatsRows;
      },
      async getCoachesByIds(ids) {
        expect(ids.sort()).toEqual([10, 11]);
        return coaches;
      },
      async saveUserWeekPoints(userId, w, fantasyPoints) {
        saved.push({ userId, weekNumber: w, fantasyPoints });
      },
      async recomputeTotalsFromHistory() {
        recomputeCalled = true;
      }
    };

    // --- Run engine under test ---
    const result = await runWeeklyScoring(weekNumber, dataSource);

    // Check summary
    expect(result).toEqual({ weekNumber, processedUsers: teams.length });
    expect(recomputeCalled).toBe(true);
    expect(saved).toHaveLength(2);

    // Compute expected scores using real scoring function
    const statsById = {};
    for (const row of playerStatsRows) {
      statsById[row.player_id] = row;
    }

    const user1Players = [1, 2, 3];
    let user1Pts = 0;
    user1Players.forEach(pid => {
      user1Pts += calculatePlayerFantasyPoints(statsById[pid]);
    });
    user1Pts += coaches[0].bonus_points;
    user1Pts = Math.round(user1Pts * 10) / 10;

    const user2Players = [2, 3];
    let user2Pts = 0;
    user2Players.forEach(pid => {
      user2Pts += calculatePlayerFantasyPoints(statsById[pid]);
    });
    user2Pts += coaches[1].bonus_points;
    user2Pts = Math.round(user2Pts * 10) / 10;

    const rec1 = saved.find(s => s.userId === 1);
    const rec2 = saved.find(s => s.userId === 2);

    expect(rec1.fantasyPoints).toBeCloseTo(user1Pts, 1);
    expect(rec2.fantasyPoints).toBeCloseTo(user2Pts, 1);
  });

  test('returns 0 processedUsers if no teams', async () => {
    const dataSource = {
      async getAllUserTeams() {
        return [];
      },
      async getWeeklyStatsForPlayers() {
        return [];
      },
      async getCoachesByIds() {
        return [];
      },
      async saveUserWeekPoints() {},
      async recomputeTotalsFromHistory() {}
    };

    const result = await runWeeklyScoring(1, dataSource);
    expect(result).toEqual({ weekNumber: 1, processedUsers: 0 });
  });
});
