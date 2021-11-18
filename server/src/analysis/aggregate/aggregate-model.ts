import { AnalysisRecord } from "../analysis-model";
import { AggregateData, AnalysisData } from "../../common/api-data-types";
import { getTimeInterval } from "../../common/utils";

export const computeAggregate = async ({
  guildId,
  channelId,
  start,
  end,
  intervalUnit,
  intervalStep = 1,
  toxicityThreshold,
}: {
  guildId: string;
  channelId: string;
  start: number;
  end: number;
  intervalUnit: "minute" | "hour";
  intervalStep?: number;
  toxicityThreshold: number;
}): Promise<AggregateData[]> => {
  const groups: { _id: number; analyses: AnalysisData[] }[] =
    await AnalysisRecord.aggregate([
      {
        $match: {
          guildId,
          channelId,
          createdTimestamp: {
            $gte: +getTimeInterval(intervalUnit, intervalStep).floor(
              new Date(start)
            ),
            $lt: +getTimeInterval(intervalUnit, intervalStep).ceil(
              new Date(end)
            ),
          },
        },
      },
      {
        $group: {
          _id: {
            $toLong: {
              $dateTrunc: {
                date: { $toDate: "$createdTimestamp" },
                unit: intervalUnit,
                binSize: intervalStep,
              },
            },
          },

          analyses: {
            $push: { $first: "$analyses" },
          },
        },
      },
    ]);

  return groups.map(({ _id: start, analyses }) => ({
    timespan: {
      start,
      end: +getTimeInterval(intervalUnit, intervalStep).offset(new Date(start)),
    },
    numMessages: analyses.length,
    toxicity: {
      numUnknown: analyses.filter(
        ({ overallToxicity }) => typeof overallToxicity !== "number"
      ).length,
      numOverThreshold: analyses.filter(
        ({ overallToxicity }) =>
          typeof overallToxicity === "number" &&
          overallToxicity >= toxicityThreshold
      ).length,
    },
  }));
};
