function doRangesOverlap(
  [a1, b1]: [number, number],
  [a2, b2]: [number, number]
) {
  return !(b2 <= a1 || b1 <= a2);
}

export function simplifyRangeUnion(rangeUnion: [number, number][]) {
  const simplified = [] as [number, number][];
  for (const range1 of rangeUnion) {
    let range = range1;
    while (true) {
      const i = simplified.findIndex((range2) =>
        doRangesOverlap(range1, range2)
      );

      if (i !== -1) {
        const [range2] = simplified.splice(i, 1);
        range = [
          Math.min(range[0], range2[0]),
          Math.max(range[1], range2[1]),
        ] as [number, number];
      } else {
        simplified.push(range);
        break;
      }
    }
  }

  return simplified;
}

function rangeIntersection_(
  [min1, max1]: [number, number],
  [min2, max2]: [number, number]
): [] | [[number, number]] {
  if (!doRangesOverlap([min1, max1], [min2, max2])) return [];
  return [[Math.max(min1, min2), Math.min(max1, max2)]];
}

export function rangeIntersection(
  rangeUnion1: [number, number][],
  rangeUnion2: [number, number][]
): [number, number][] {
  return simplifyRangeUnion(
    rangeUnion1
      .map((range1) =>
        rangeUnion2.map((range2) => rangeIntersection_(range1, range2)).flat()
      )
      .flat()
  );
}

export function reduceRangeIntersection(
  rangeUnions: [number, number][][]
): [number, number][] {
  if (rangeUnions.length === 0) return [];
  let intersection = rangeUnions[0] as [number, number][];
  for (const rangeUnion of rangeUnions.slice(1)) {
    intersection = rangeIntersection(intersection, rangeUnion);
    if (intersection.length === 0) break;
  }
  return intersection;
}

function rangeDifference_(
  [min1, max1]: [number, number],
  [min2, max2]: [number, number]
): [number, number][] {
  if (min1 >= min2 && max1 <= max2) {
    return [];
  }

  if (min1 <= min2 && max1 <= max2) {
    return [[min1, Math.min(min2, max1)]];
  }

  if (min1 >= min2 && max1 >= max2) {
    return [[Math.max(min1, max2), max1]];
  }

  if (min1 <= min2 && max1 >= max2) {
    return [
      [min1, min2],
      [max2, max1],
    ];
  }

  return [[min1, max1]];
}

export function rangeDifference(
  rangeUnion1: [number, number][],
  rangeUnion2: [number, number][]
) {
  if (rangeUnion2.length === 0) return rangeUnion1;
  return simplifyRangeUnion(
    rangeUnion1
      .map((range1) =>
        reduceRangeIntersection(
          rangeUnion2.map((range2) => rangeDifference_(range1, range2))
        )
      )
      .flat()
  );
}
