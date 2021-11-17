import { to } from "await-to-js";
import { Result } from "perspective-api-client";
import { AnalysisData } from "../common/api-data-types";
import { fetchMessage } from "../discord/model";
import { AnalysisCache } from "./analysis-cache-model";
import { perspective } from "./perspective-client";

const toAnalysisData = (result: Result): AnalysisData =>
  result && {
    overallToxicity: result.attributeScores["TOXICITY"].summaryScore.value,
  };

const analyzeText = async (
  text: string | null
): Promise<AnalysisData | undefined> => {
  if (!text) return;

  // ignore err for now
  const [err, result] = await to(perspective.analyze(text));

  return toAnalysisData(result);
};

export const analyzeMessage = async (
  guildId: string,
  channelId: string,
  messageId: string,
  waitForCache = false
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

  const update = AnalysisCache.updateOne(
    { guildId, channelId, messageId },
    {
      analysis,
      createdTimestamp: message.createdTimestamp,
      editTimestamp: message.editTimestamp,
    },
    { upsert: true }
  ).exec();
  if (waitForCache) await update;

  return analysis;
};
