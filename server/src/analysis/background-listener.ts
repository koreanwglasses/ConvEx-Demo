import { Message } from "discord.js";
import client from "../discord/client";
import { Subscriber } from "../subscribers/model";
import { analyzeMessage } from "./analysis-model";

const handleMessageCreate = async (message: Message) => {
  const { guildId, channelId, id: messageId } = message;

  const subscriber = await Subscriber.findOne({ guildId }).exec();
  if (!subscriber?.privileges?.includes("BackgroundAnalysis")) return;

  // Compute + cache message analysis
  analyzeMessage(guildId, channelId, messageId);
};

export const start = () => {
  client.addListener("messageCreate", handleMessageCreate);
};
