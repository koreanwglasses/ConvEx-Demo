import * as d3 from "d3-time";

export const getTimeInterval = (unit: "minute" | "hour" | "day", step = 1) =>
  ({
    minute: d3.timeMinute,
    hour: d3.timeHour,
    day: d3.timeDay,
  }[unit].every(step) as d3.TimeInterval);
