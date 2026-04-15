import { calculateStreaks } from '../../helpers/streak.helper.js';

describe('Streak Helper', () => {
  it('should return 0 for empty array', () => {
    const res = calculateStreaks([], '2026-04-15');
    expect(res.current).toBe(0);
    expect(res.best).toBe(0);
  });

  it('should calculate current and best correctly', () => {
    // Array comes in DESC order
    const dates = [
      '2026-04-15',
      '2026-04-14',
      '2026-04-13',
      // skip 12
      '2026-04-11',
      '2026-04-10',
      '2026-04-09',
      '2026-04-08'
    ];
    
    const res = calculateStreaks(dates, '2026-04-15');
    expect(res.current).toBe(3);   // 15, 14, 13
    expect(res.best).toBe(4);      // 11, 10, 9, 8
  });

  it('should keep current streak alive if last active was yesterday', () => {
    const dates = [
      '2026-04-14',
      '2026-04-13'
    ];
    // Today is the 15th, so they haven't done it yet today, but streak is ALIVE (2 days)
    const res = calculateStreaks(dates, '2026-04-15');
    expect(res.current).toBe(2);
    expect(res.best).toBe(2);
  });

  it('should break current streak if skipping more than 1 day', () => {
    const dates = [
      '2026-04-13',
      '2026-04-12'
    ];
    // Today is the 15th, last was 13th. 2 days gap -> streak broke
    const res = calculateStreaks(dates, '2026-04-15');
    expect(res.current).toBe(0);
    
    // Best should be 2 still
    expect(res.best).toBe(2);
  });
});
