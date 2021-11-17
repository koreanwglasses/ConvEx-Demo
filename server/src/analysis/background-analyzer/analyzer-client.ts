import { Message } from "discord.js";
import { analyzeMessage } from "../perspective-model";
import client from "../../discord/client";
import { Subscriber } from "../../subscribers/model";
import { getTimeInterval, recordAnalysis } from "./analysis-summary-model";

const timeIntervals = [
  { interval: "minute", step: 1 },
  { interval: "hour", step: 1 },
] as const;

const handleMessageCreate = async (message: Message) => {
  const { guildId, channelId, id: messageId, createdTimestamp } = message;

  const subscriber = await Subscriber.findOne({ guildId }).exec();
  if (!subscriber?.privileges?.includes("BackgroundAnalysis")) return;

  // Compute + cache message analysis
  await analyzeMessage(guildId, channelId, messageId, true);

  // Update analysis summary with recored analysis
  const createdTime = new Date(createdTimestamp);
  timeIntervals.forEach(({ interval, step }) => {
    const timeInterval = getTimeInterval(interval, step);
    const start = +timeInterval.floor(createdTime);
    recordAnalysis({ guildId, channelId, start, interval, step });
  });
};

export const start = () => {
  client.on("messageCreate", handleMessageCreate);
};
