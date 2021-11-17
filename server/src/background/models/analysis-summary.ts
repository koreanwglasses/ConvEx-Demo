import mongoose, { FilterQuery } from "mongoose";
import * as d3_time from "d3-time";
import * as d3_array from "d3-array";
import { AnalysisCache } from "../../analysis/analysis-cache-model";
const { Schema, model } = mongoose;

export type Interval = "minute" | "hour" | "day";
export const getTimeInterval = (interval: Interval, step = 1) =>
  ({
    minute: d3_time.timeMinute,
    hour: d3_time.timeHour,
    day: d3_time.timeDay,
  }[interval].every(step));

export interface AnalysisSummary {
  guildId: string;
  channelId: string;
  timeInterval: {
    start: number;
    interval: Interval;
    step: number;
  };
  summary?: {
    totalMessages: number;
    toxicity: {
      n: number;
      mean: number;
      variance: number;
      median: number;
      min: number;
      max: number;
    };
  };
}

const schema = new Schema<AnalysisSummary>({
  guildId: String,
  channelId: String,
  timeInterval: {
    start: Number,
    interval: String,
    step: Number,
  },
  summary: {
    totalMessages: Number,
    toxicity: {
      n: Number,
      mean: Number,
      variance: Number,
      median: Number,
      min: Number,
      max: Number,
    },
  },
});

export const AnalysisSummary = model<AnalysisSummary>(
  "AnalysisSummary",
  schema
);

export const fetchAnalysisSummaries = async ({
  guildId,
  channelId,
  start,
  end,
}: {
  guildId: string;
  channelId: string;
  start: number;
  end?: number;
}) => {
  // Timestamp of end of summary time interval
  const $end: FilterQuery<AnalysisSummary> = {
    $toLong: {
      $dateAdd: { startDate: "$start", unit: "$interval", amount: "$step" },
    },
  };

  if (typeof end === "number") {
    // Shortest spanned time at which the two intervals are disjoint
    const span_0: FilterQuery<AnalysisSummary> = {
      $add: [
        end - start,
        {
          $sub: [$end, "$start"],
        },
      ],
    };

    // Total span of the two intervals, including time between, if any
    const span: FilterQuery<AnalysisSummary> = {
      $max: [{ $sub: ["$start", end] }, { $sub: [start, $end] }],
    };

    return await AnalysisSummary.find({
      guildId,
      channelId,
      $expr: { $lte: [span, span_0] },
    }).exec();
  } else {
    return await AnalysisSummary.find({
      guildId,
      channelId,
      $expr: { $gte: [$end, start] },
    }).exec();
  }
};

export const recordAnalysis = async ({
  guildId,
  channelId,
  start,
  interval,
  step,
}: {
  guildId: string;
  channelId: string;
  start: number;
  interval: Interval;
  step: number;
}) => {
  const timeInterval = getTimeInterval(interval, step);
  const analyses = await AnalysisCache.find({
    guildId,
    channelId,
    createdTimestamp: {
      $gte: +start,
      $lte: +timeInterval.offset(new Date(start)),
    },
  }).exec();

  const toxicities = analyses
    .map((analysis) => analysis.analysis?.overallToxicity)
    .filter((tox) => typeof tox === "number");

  await AnalysisSummary.findOneAndUpdate(
    {
      guildId,
      channelId,
      "timeInterval.start": start,
      "timeInterval.interval": interval,
      "timeInterval.step": step,
    },
    {
      $set: {
        summary: {
          totalMessages: analyses.length,
          toxicity: {
            n: toxicities.length,
            mean: d3_array.mean(toxicities),
            variance: d3_array.variance(toxicities),
            median: d3_array.median(toxicities),
            min: Math.min(...toxicities),
            max: Math.max(...toxicities),
          },
        },
      },
    },
    { upsert: true }
  ).exec();
};
