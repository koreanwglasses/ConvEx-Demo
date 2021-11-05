import {
  ChannelLogsQueryOptions,
  Guild,
  GuildMember,
  Message,
  MessageAttachment,
  MessageEmbed,
  OAuth2Guild,
  TextChannel,
  User,
} from "discord.js";
import {
  ChannelData,
  GuildData,
  MessageData,
  UserData,
  MemberData,
  EmbedData,
  AttachmentData,
} from "../common/api-data-types";
import { client } from "./bot";

const toGuildData = (guild: OAuth2Guild | Guild): GuildData =>
  guild && {
    id: guild.id,
    name: guild.name,
    iconURL: guild.iconURL(),
  };

const toUserData = (user: User): UserData =>
  user && {
    id: user.id,
    username: user.username,
    discriminator: user.discriminator,
    avatarURL: user.avatarURL(),
  };

const toMemberData = (member: GuildMember): MemberData =>
  member && {
    id: member.id,
    user: toUserData(member.user),
    displayAvatarURL: member.displayAvatarURL(),
    displayHexColor: member.displayHexColor,
  };

const toChannelData = (channel: TextChannel): ChannelData =>
  channel && {
    id: channel.id,
    name: channel.name,
  };

const toMessageData = (message: Message): MessageData =>
  message && {
    id: message.id,
    content: message.content,
    cleanContent: message.cleanContent,
    createdTimestamp: message.createdTimestamp,
    authorID: message.author.id,
    type: message.type,
    embeds: message.embeds?.map(toEmbedData),
    attachments: Object.fromEntries(
      [...message.attachments.entries()].map(
        ([k, v]) => [k, toAttachmentData(v)] as const
      )
    ),
  };

const toEmbedData = (embed: MessageEmbed): EmbedData => embed && {};
const toAttachmentData = (attachment: MessageAttachment): AttachmentData =>
  attachment && {};

export const fetchGuilds = async () =>
  (await client.guilds.fetch()).map(toGuildData);

export const fetchUser = async (id: string) =>
  toUserData(await client.users.fetch(id));

export const fetchMember = async (guildId: string, memberId: string) => {
  const guild = await client.guilds.fetch(guildId);
  const member = await guild.members.fetch(memberId);
  return toMemberData(member);
};

export const fetchGuildTextChannels = async (guildId: string) => {
  const guild = await client.guilds.fetch(guildId);
  const bot = await guild.members.fetch(client.user);

  return (await guild.channels.fetch())
    .filter(
      (channel) =>
        channel.type === "GUILD_TEXT" &&
        bot.permissionsIn(channel).has(["READ_MESSAGE_HISTORY", "VIEW_CHANNEL"])
    )
    .map(toChannelData);
};

export const fetchMessages = async (
  guildId: string,
  channelId: string,
  options?: ChannelLogsQueryOptions
) => {
  const channel = await (
    await client.guilds.fetch(guildId)
  ).channels.fetch(channelId);
  if (channel.type !== "GUILD_TEXT")
    throw new Error("Channel is not text channel");

  return (await channel.messages.fetch(options)).map(toMessageData);
};

export const fetchMessage = async (
  guildId: string,
  channelId: string,
  messageId: string
) => {
  const channel = await (
    await client.guilds.fetch(guildId)
  ).channels.fetch(channelId);
  if (channel.type !== "GUILD_TEXT")
    throw new Error("Channel is not text channel");

  return toMessageData(await channel.messages.fetch(messageId));
};
