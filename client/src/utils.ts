import { to } from "await-to-js";
import * as d3 from "d3";

const removeUndefined = (obj: any) => {
  return Object.fromEntries(
    Object.entries(obj).filter(([k, v]) => typeof v !== "undefined")
  );
};

export const fetchJSON = async <T = any>(url: string, body?: any) => {
  const [err0, res] = await to(
    fetch(
      url,
      removeUndefined({
        method: "POST",
        headers: body && {
          "Content-Type": "application/json",
        },
        body: body && JSON.stringify(removeUndefined(body)),
      })
    )
  );
  if (err0) return [err0] as const;
  if (!res?.ok) return [res] as const;

  const [err1, result] = await to(res.json());
  if (err1) return [err1] as const;
  return [null, result as T] as const;
};

function deepEqual_(left: unknown, right: unknown, depth = 10) {
  if (depth < 0) throw new Error("Reached maximum depth");

  if (Object.is(left, right)) return true;
  if (typeof left !== "object" || typeof right !== "object") return false;
  if (left === null || right === null) return false;

  const leftEntries = Object.entries(left);
  const rightKeys = Object.keys(right);

  if (leftEntries.length !== rightKeys.length) return false;

  for (const [key, value] of leftEntries) {
    if (
      !(key in right) ||
      !deepEqual_(value, (right as Record<string, unknown>)[key], depth - 1)
    )
      return false;
  }

  return true;
}

export function deepEqual(
  depth?: number
): (left: unknown, right: unknown) => boolean;
export function deepEqual(left: unknown, right: unknown): boolean;
export function deepEqual(depth_left?: number | unknown, right?: unknown) {
  if (arguments.length <= 1) {
    const depth = depth_left as number | undefined;
    return (left: unknown, right: unknown) => deepEqual_(left, right, depth);
  } else {
    const left = depth_left as unknown;
    return deepEqual_(left, right);
  }
}

export const getTimeInterval = (unit: "minute" | "hour" | "day", step = 1) =>
  ({
    minute: d3.timeMinute,
    hour: d3.timeHour,
    day: d3.timeDay,
  }[unit].every(step) as d3.TimeInterval);
