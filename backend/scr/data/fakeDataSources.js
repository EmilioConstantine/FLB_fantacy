// src/data/fakeDataSource.js

// In-memory "tables"

// Users (id, username, budget_remaining, total_points)
let users = [
  { id: 1, username: 'jimmy', budget_remaining: 100, total_points: 0 },
  { id: 2, username: 'sara', budget_remaining: 100, total_points: 0 }
];

// Players (id, name, team, position, price)
let players = [
  { id: 1, name: 'Player 1', team: 'Sagesse', position: 'G', price: 20 },
  { id: 2, name: 'Player 2', team: 'Riyadi', position: 'F', price: 22 },
  { id: 3, name: 'Player 3', team: 'Homenetmen', position: 'C', price: 18 },
  { id: 4, name: 'Player 4', team: 'Champville', position: 'G', price: 16 },
  { id: 5, name: 'Player 5', team: 'Byblos', position: 'F', price: 24 }
];

// Coaches (id, name, team, price, bonus_points)
let coaches = [
  { id: 1, name: 'Coach A', team: 'Sagesse', price: 10, bonus_points: 5 },
  { id: 2, name: 'Coach B', team: 'Riyadi', price: 12, bonus_points: 5 }
];

// user_team (one per user)
let userTeams = [
  { user_id: 1, player1: 1, player2: 2, player3: 3, player4: 4, player5: 5, coach: 1 },
  { user_id: 2, player1: 2, player2: 3, player3: 4, player4: 5, player5: 1, coach: 2 }
];

// weekly_stats
// For simplicity we store some test stats for week 1.
let weeklyStats = [
  {
    player_id: 1,
    week_number: 1,
    points: 20,
    rebounds: 5,
    assists: 3,
    steals: 2,
    blocks: 1,
    turnovers: 2
  },
  {
    player_id: 2,
    week_number: 1,
    points: 15,
    rebounds: 7,
    assists: 4,
    steals: 1,
    blocks: 0,
    turnovers: 3
  }
  // add more if you want
];

// user_points
let userPoints = [
  // { user_id, week_number, fantasy_points }
];

function findUserById(id) {
  return users.find(u => u.id === id);
}

function nextId(arr) {
  return arr.length ? Math.max(...arr.map(x => x.id)) + 1 : 1;
}

module.exports = {
  // ============= Core functions used by weeklyEngine =============

  async getAllUserTeams() {
    return userTeams.map(t => {
      const user = findUserById(t.user_id);
      return {
        user_id: t.user_id,
        username: user ? user.username : 'unknown',
        player1: t.player1,
        player2: t.player2,
        player3: t.player3,
        player4: t.player4,
        player5: t.player5,
        coach: t.coach
      };
    });
  },

  async getWeeklyStatsForPlayers(weekNumber, playerIds) {
    return weeklyStats.filter(
      s => s.week_number === weekNumber && playerIds.includes(s.player_id)
    );
  },

  async getCoachesByIds(coachIds) {
    return coaches.filter(c => coachIds.includes(c.id));
  },

  async saveUserWeekPoints(userId, weekNumber, fantasyPoints) {
    const existing = userPoints.find(
      up => up.user_id === userId && up.week_number === weekNumber
    );
    if (existing) {
      existing.fantasy_points = fantasyPoints;
    } else {
      userPoints.push({ user_id: userId, week_number: weekNumber, fantasy_points: fantasyPoints });
    }

    // update user total_points incrementally
    const user = findUserById(userId);
    if (user) {
      // recompute just for this user
      const total = userPoints
        .filter(up => up.user_id === userId)
        .reduce((sum, up) => sum + up.fantasy_points, 0);
      user.total_points = total;
    }
  },

  async recomputeTotalsFromHistory() {
    users = users.map(u => {
      const total = userPoints
        .filter(up => up.user_id === u.id)
        .reduce((sum, up) => sum + up.fantasy_points, 0);
      return { ...u, total_points: total };
    });
  },

  async getLeaderboard(limit = 100) {
    const sorted = [...users].sort((a, b) => b.total_points - a.total_points);
    return sorted.slice(0, limit).map(u => ({
      userId: u.id,
      username: u.username,
      totalPoints: u.total_points
    }));
  },

  // ============= Admin-like functions =============

  async addPlayer(data) {
    const id = nextId(players);
    const player = {
      id,
      name: data.name,
      team: data.team || null,
      position: data.position || null,
      price: data.price
    };
    players.push(player);
    return player;
  },

  async addCoach(data) {
    const id = nextId(coaches);
    const coach = {
      id,
      name: data.name,
      team: data.team || null,
      price: data.price,
      bonus_points: data.bonus_points || 5
    };
    coaches.push(coach);
    return coach;
  },

  async addOrUpdateWeeklyStats(data) {
    const {
      player_id,
      week_number,
      points = 0,
      rebounds = 0,
      assists = 0,
      steals = 0,
      blocks = 0,
      turnovers = 0
    } = data;

    const existing = weeklyStats.find(
      ws => ws.player_id === player_id && ws.week_number === week_number
    );

    if (existing) {
      existing.points = points;
      existing.rebounds = rebounds;
      existing.assists = assists;
      existing.steals = steals;
      existing.blocks = blocks;
      existing.turnovers = turnovers;
      return existing;
    } else {
      const row = {
        player_id,
        week_number,
        points,
        rebounds,
        assists,
        steals,
        blocks,
        turnovers
      };
      weeklyStats.push(row);
      return row;
    }
  },

  async getAllUserTeamsDetailed() {
    return userTeams.map(t => {
      const user = findUserById(t.user_id);
      const p1 = players.find(p => p.id === t.player1);
      const p2 = players.find(p => p.id === t.player2);
      const p3 = players.find(p => p.id === t.player3);
      const p4 = players.find(p => p.id === t.player4);
      const p5 = players.find(p => p.id === t.player5);
      const c = coaches.find(co => co.id === t.coach);

      return {
        user_id: t.user_id,
        username: user ? user.username : 'unknown',
        total_points: user ? user.total_points : 0,
        players: [p1, p2, p3, p4, p5].filter(Boolean),
        coach: c || null
      };
    });
  },

  // ============= Team building with budget + duplicate check  =============

  async saveUserTeamWithValidation(userId, playerIds, coachId) {
    if (!Array.isArray(playerIds) || playerIds.length !== 5) {
      throw new Error('You must select exactly 5 players.');
    }

    // no duplicates
    const uniq = new Set(playerIds);
    if (uniq.size !== playerIds.length) {
      throw new Error('Duplicate players are not allowed.');
    }

    const user = findUserById(userId);
    if (!user) throw new Error('User not found.');

    const selectedPlayers = players.filter(p => playerIds.includes(p.id));
    if (selectedPlayers.length !== 5) {
      throw new Error('Some players not found.');
    }

    const coach = coaches.find(c => c.id === coachId);
    if (!coach) throw new Error('Coach not found.');

    const totalCost =
      selectedPlayers.reduce((sum, p) => sum + p.price, 0) + coach.price;

    if (totalCost > user.budget_remaining) {
      throw new Error(
        `Budget exceeded: cost = ${totalCost}, remaining = ${user.budget_remaining}`
      );
    }

    // Save team
    const existing = userTeams.find(ut => ut.user_id === userId);
    if (existing) {
      existing.player1 = playerIds[0];
      existing.player2 = playerIds[1];
      existing.player3 = playerIds[2];
      existing.player4 = playerIds[3];
      existing.player5 = playerIds[4];
      existing.coach = coachId;
    } else {
      userTeams.push({
        user_id: userId,
        player1: playerIds[0],
        player2: playerIds[1],
        player3: playerIds[2],
        player4: playerIds[3],
        player5: playerIds[4],
        coach: coachId
      });
    }

    // Update budget
    user.budget_remaining -= totalCost;

    return {
      totalCost,
      budget_remaining: user.budget_remaining
    };
  }
};
