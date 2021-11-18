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
  editTimestamp: number | null;
  authorId: string;
  type: MessageType;
  embeds: EmbedData[];
  attachments: { [id: string]: AttachmentData };
}

export interface EmbedData {}
export interface AttachmentData {}

export interface AnalysisData {
  timestamp: number;
  overallToxicity?: number | null;
}

export interface AggregateData {
  timespan: {
    start: number;
    end: number;
  };
  numMessages: number;
  toxicity: {
    numOverThreshold: number;
    numUnknown: number;
  };
}
