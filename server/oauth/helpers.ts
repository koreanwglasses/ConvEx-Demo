import { PermissionString } from "discord.js";
import { client } from "../discord/bot";

export async function hasPermission(
  permission: PermissionString,
  userId: string,
  guildId: string,
  channelId?: string
) {
  const guild = await client.guilds.fetch(guildId);
  const member = await guild.members.fetch(userId);

  if (channelId) return member.permissionsIn(channelId).has(permission);
  else return member.permissions.has(permission);
}
