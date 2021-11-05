import to from "await-to-js";
import { Result } from "perspective-api-client";
import { AnalysisData } from "../common/api-data-types";
import { fetchMessage } from "../discord/model";
import { AnalysisCache } from "./cache";
import { perspective } from "./perspective";

const toAnalysisData = (result: Result): AnalysisData =>
  result && {
    overallToxicity: result.attributeScores["TOXICITY"].summaryScore.value,
  };

const analyzeText = async (text: string | null) => {
  if (!text) return null;

  // ignore err for now
  const [err, result] = await to(perspective.analyze(text));

  return toAnalysisData(result) as AnalysisData | null;
};

export const analyzeMessage = async (
  guildId: string,
  channelId: string,
  messageId: string
) => {
  const message = await fetchMessage(guildId, channelId, messageId);
  const cacheResult = await AnalysisCache.findOne({
    guildId,
    channelId,
    messageId,
    editTimestamp: message.editTimestamp,
  }).exec();

  if (cacheResult) return cacheResult.analysis;

  const analysis = await analyzeText(message.cleanContent);
  AnalysisCache.updateOne(
    { guildId, channelId, messageId },
    { analysis, editTimestamp: message.editTimestamp },
    { upsert: true }
  ).exec();
  return analysis;
};
