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
  user: UserData;
  displayAvatarURL: string;
  displayHexColor: string;
}

export interface ChannelData {
  id: string;
  name: string;
}

export interface MessageData {
  id: string;
  content: string;
  cleanContent: string;
  createdTimestamp: number;
  authorID: string;
  type: MessageType;
  embeds: EmbedData[];
  attachments: { [id: string]: AttachmentData };
}

export interface EmbedData {}
export interface AttachmentData {}

export interface AnalysisData {
  overallToxicity: number;
}
