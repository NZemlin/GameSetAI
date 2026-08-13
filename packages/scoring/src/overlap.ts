import type { Point } from './types';

export function rangesOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function isTimeInPoint(time: number, points: Point[], excludeIndex?: number): boolean {
  return points.some((point, index) => {
    if (index === excludeIndex) return false;
    return time >= point.startTime && time <= point.endTime;
  });
}

export function pointOverlapsExisting(
  startTime: number,
  endTime: number,
  points: Point[],
  excludeIndex?: number
): boolean {
  return points.some((point, index) => {
    if (index === excludeIndex) return false;
    return rangesOverlap(startTime, endTime, point.startTime, point.endTime);
  });
}
