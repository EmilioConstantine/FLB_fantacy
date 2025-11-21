// scr/tests/scoring.test.js

const {
  SCORING,
  calculatePlayerFantasyPoints,
  calculateCoachBonus
} = require('../core/scoring');

describe('scoring.js', () => {
  test('SCORING constants exist', () => {
    expect(SCORING).toBeDefined();
    expect(typeof SCORING.points).toBe('number');
    expect(typeof SCORING.rebounds).toBe('number');
    expect(typeof SCORING.assists).toBe('number');
    expect(typeof SCORING.steals).toBe('number');
    expect(typeof SCORING.blocks).toBe('number');
    expect(typeof SCORING.turnovers).toBe('number');
  });

  test('calculatePlayerFantasyPoints basic case', () => {
    const stats = {
      points: 20,
      rebounds: 10,
      assists: 5,
      steals: 2,
      blocks: 1,
      turnovers: 3
    };

    const expected =
      20 * SCORING.points +
      10 * SCORING.rebounds +
      5 * SCORING.assists +
      2 * SCORING.steals +
      1 * SCORING.blocks +
      3 * SCORING.turnovers;

    const score = calculatePlayerFantasyPoints(stats);

    expect(score).toBeCloseTo(expected, 1);
  });

  test('calculatePlayerFantasyPoints handles missing fields as 0', () => {
    const stats = { points: 10 }; // others undefined
    const expected = 10 * SCORING.points;
    const score = calculatePlayerFantasyPoints(stats);

    expect(score).toBeCloseTo(expected, 1);
  });

  test('calculateCoachBonus returns 0 when no coach', () => {
    expect(calculateCoachBonus(null)).toBe(0);
  });

  test('calculateCoachBonus returns bonus_points', () => {
    expect(
      calculateCoachBonus({ id: 1, name: 'Coach A', bonus_points: 7 })
    ).toBe(7);
  });
});
