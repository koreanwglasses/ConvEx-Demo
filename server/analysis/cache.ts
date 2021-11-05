import mongoose from "mongoose";

const analysisCacheSchema = new mongoose.Schema({
  guildId: String,
  channelId: String,
  messageId: String,
  editTimestamp: Number,
  analysis: { overallToxicity: Number },
});

export const AnalysisCache = mongoose.model(
  "AnalysisCache",
  analysisCacheSchema
);
