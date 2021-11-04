import { OAuth2Guild, TextChannel, User } from "discord.js";
import { ChannelData, GuildData, UserData } from "../common/api-data-types";
import { client } from "./bot";

const toGuildData = (guild: OAuth2Guild): GuildData =>
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

const toChannelData = (channel: TextChannel): ChannelData =>
  channel && {
    id: channel.id,
    name: channel.name,
  };

export const fetchGuilds = async () =>
  (await client.guilds.fetch()).map(toGuildData);

export const fetchUser = async (id: string) =>
  toUserData(await client.users.fetch(id));

export const fetchGuildTextChannels = async (guildId: string) =>
  (await (await client.guilds.fetch(guildId)).channels.fetch())
    .filter((channel) => channel.type === "GUILD_TEXT")
    .map(toChannelData);
