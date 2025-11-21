// scr/tests/fakeDataSources.test.js

const dataSource = require('../data/fakeDataSources');

describe('fakeDataSources – team validation & budget rules', () => {
  beforeEach(() => {
    // reset in-memory DB before each test (see __debug.resetAll)
    dataSource.__debug.resetAll();
  });

  test('saveUserTeamWithValidation succeeds with valid data', async () => {
    const userId = 1;
    const playerIds = [1, 2, 3, 4, 5];
    const coachId = 10;

    const result = await dataSource.saveUserTeamWithValidation(
      userId,
      playerIds,
      coachId
    );

    // total cost = 20+22+18+16+24+10 = 110
    expect(result.totalCost).toBe(110);
    expect(result.budget_remaining).toBe(100 - 110); // can go negative if you allow that, or adjust budget in resetAll

    const teams = dataSource.__debug.userTeams;
    expect(teams).toHaveLength(1);
    expect(teams[0]).toMatchObject({
      user_id: 1,
      player1: 1,
      player2: 2,
      player3: 3,
      player4: 4,
      player5: 5,
      coach: 10
    });
  });

  test('fails if not exactly 5 players', async () => {
    await expect(
      dataSource.saveUserTeamWithValidation(1, [1, 2, 3, 4], 10)
    ).rejects.toThrow('You must select exactly 5 players.');
  });

  test('fails on duplicate players', async () => {
    await expect(
      dataSource.saveUserTeamWithValidation(1, [1, 1, 2, 3, 4], 10)
    ).rejects.toThrow('Duplicate players are not allowed.');
  });

  test('fails if user not found', async () => {
    await expect(
      dataSource.saveUserTeamWithValidation(999, [1, 2, 3, 4, 5], 10)
    ).rejects.toThrow('User not found.');
  });

  test('fails if coach not found', async () => {
    await expect(
      dataSource.saveUserTeamWithValidation(1, [1, 2, 3, 4, 5], 999)
    ).rejects.toThrow('Coach not found.');
  });

  test('fails if total cost exceeds budget', async () => {
    // Set user 1 budget to 50 so it fails
    const users = dataSource.__debug.users;
    const u = users.find(u => u.id === 1);
    u.budget_remaining = 50;

    await expect(
      dataSource.saveUserTeamWithValidation(1, [1, 2, 3, 4, 5], 10)
    ).rejects.toThrow('Budget exceeded');
  });
});
