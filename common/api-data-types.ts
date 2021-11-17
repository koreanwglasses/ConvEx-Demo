import type { MessageType } from "discord.js";

export interface GuildData {
  id: string;
  name: string;
  iconURL: string;
}

export interface UserData {
  id: string;
  username: string;
  discriminator: string;
  avatarURL: string;
}

export interface MemberData {
  id: string;
  guildId: string;
  user: UserData;
  displayAvatarURL: string;
  displayHexColor: string;
}

export interface ChannelData {
  id: string;
  guildId: string;
  name: string;
}

export interface MessageData {
  id: string;
  guildId: string;
  channelId: string;
  content: string;
  cleanContent: string;
  createdTimestamp: number;
  editTimestamp: number;
  authorId: string;
  type: MessageType;
  embeds: EmbedData[];
  attachments: { [id: string]: AttachmentData };
}

export interface EmbedData {}
export interface AttachmentData {}

export interface AnalysisData {
  overallToxicity: number;
}

export type Interval = "minute" | "hour" | "day";
export interface AnalysisSummary {
  guildId: string;
  channelId: string;
  timeInterval: {
    start: number;
    interval: Interval;
    step: number;
  };
  summary: {
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
