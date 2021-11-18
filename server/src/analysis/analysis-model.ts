import mongoose from "mongoose";
const { Schema, model } = mongoose;
import { AnalysisData } from "../common/api-data-types";
import { fetchMessage } from "../discord/model";
import { analyzeText } from "./toxicity/perspective-model";
const Long = mongoose.Schema.Types.Long;

interface AnalysisRecord {
  guildId: string;
  channelId: string;
  messageId: string;
  createdTimestamp: number;
  analyses: AnalysisData[];
}

const schema = new Schema<AnalysisRecord>({
  guildId: String,
  channelId: String,
  messageId: String,
  createdTimestamp: Long,
  analyses: [{ timestamp: Long, overallToxicity: Number }],
});

export const AnalysisRecord = model<AnalysisRecord>("Analysis", schema);

export const analyzeMessage = async (
  guildId: string,
  channelId: string,
  messageId: string,
  awaitWrite = false
) => {
  const message = await fetchMessage(guildId, channelId, messageId);
  const record = await AnalysisRecord.findOneAndUpdate(
    {
      guildId,
      channelId,
      messageId,
    },
    {
      $setOnInsert: {
        createdTimestamp: message.createdTimestamp,
        analyses: [{ timestamp: message.createdTimestamp }],
      },
    },
    { upsert: true, new: true }
  ).exec();

  // If message has been edited since last analyze, re-analyze
  if (
    message.editTimestamp &&
    message.editTimestamp > record.analyses[0].timestamp
  ) {
    record.analyses.unshift({ timestamp: message.editTimestamp });
  }

  // Analyze toxicity
  if (typeof record.analyses[0].overallToxicity === "undefined")
    record.analyses[0].overallToxicity = await analyzeText(
      message.cleanContent
    );

  // Save updated record to database
  const write = record.save();
  if (awaitWrite) await write;

  return record.analyses[0];
};
