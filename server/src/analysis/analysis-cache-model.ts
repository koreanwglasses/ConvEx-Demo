import mongoose from "mongoose";
const { Schema, model } = mongoose;
import { AnalysisData } from "../common/api-data-types";

interface AnalysisCache {
  guildId: string;
  channelId: string;
  messageId: string;
  createdTimestamp: number;
  editTimestamp: number;
  analysis?: AnalysisData;
}

const schema = new Schema<AnalysisCache>({
  guildId: String,
  channelId: String,
  messageId: String,
  createdTimestamp: Number,
  editTimestamp: Number,
  analysis: { overallToxicity: Number },
});

export const AnalysisCache = model<AnalysisCache>("AnalysisCache", schema);
