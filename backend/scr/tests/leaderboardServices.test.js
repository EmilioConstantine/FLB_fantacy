// scr/tests/leaderboardServices.test.js

const { getLeaderboardWithRanks } = require('../core/leaderboardServices');

describe('leaderboardServices.js – getLeaderboardWithRanks', () => {
  test('ranks users by totalPoints with ties', async () => {
    // fake dataSource that returns users
    const fakeDataSource = {
      async getLeaderboard(limit) {
        return [
          { userId: 1, username: 'jimmy',  totalPoints: 100 },
          { userId: 2, username: 'sara',   totalPoints: 120 },
          { userId: 3, username: 'george', totalPoints: 120 },
          { userId: 4, username: 'maya',   totalPoints: 90 }
        ].slice(0, limit);
      }
    };

    const result = await getLeaderboardWithRanks(10, fakeDataSource);

    // expected:
    // rank 1: sara (120)
    // rank 1: george (120)
    // rank 3: jimmy (100)
    // rank 4: maya (90)
    expect(result).toHaveLength(4);

    expect(result[0]).toMatchObject({ username: 'sara',   rank: 1, totalPoints: 120 });
    expect(result[1]).toMatchObject({ username: 'george', rank: 1, totalPoints: 120 });
    expect(result[2]).toMatchObject({ username: 'jimmy',  rank: 3, totalPoints: 100 });
    expect(result[3]).toMatchObject({ username: 'maya',   rank: 4, totalPoints: 90 });
  });
});
