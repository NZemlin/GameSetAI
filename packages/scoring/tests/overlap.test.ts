import { describe, expect, it } from 'vitest';
import { isTimeInPoint, pointOverlapsExisting } from '../src/index';
import type { Point } from '../src/index';

const p = (start: number, end: number): Point => ({
  startTime: start,
  endTime: end,
  winner: 1,
  source: 'manual',
  confirmed: true,
});

describe('overlap helpers', () => {
  const points = [p(10, 20), p(30, 40)];

  it('detects a time inside a point', () => {
    expect(isTimeInPoint(15, points)).toBe(true);
    expect(isTimeInPoint(25, points)).toBe(false);
  });

  it('can exclude an index while editing', () => {
    expect(isTimeInPoint(15, points, 0)).toBe(false);
  });

  it('detects overlapping ranges', () => {
    expect(pointOverlapsExisting(18, 25, points)).toBe(true);
    expect(pointOverlapsExisting(21, 29, points)).toBe(false);
  });
});
