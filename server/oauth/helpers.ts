import { to } from "await-to-js";
import { DiscordAPIError, PermissionString, User } from "discord.js";
import { Handler } from "express";
import { client } from "../discord/bot";

const MODERATOR_ACCESS_PERMISSIONS = [];

export async function hasPermissions(
  permissions: PermissionString[],
  userId: string,
  guildId: string,
  channelId?: string
) {
  const guild = await client.guilds.fetch(guildId);

  const [err, member] = await to(guild.members.fetch(userId));

  if (err instanceof DiscordAPIError && err.message === "Unknown Member") {
    return false;
  }
  if (err) throw err;

  if (channelId) {
    return member.permissionsIn(channelId).has(permissions);
  }
  return member.permissions.has(permissions);
}

export function hasModeratorAccess(
  userId: string,
  guildId: string,
  channelId?: string
) {
  return hasPermissions(
    MODERATOR_ACCESS_PERMISSIONS,
    userId,
    guildId,
    channelId
  );
}

export function requireAuthenticated(): Handler {
  return (req, res, next) => {
    if (req.isUnauthenticated()) {
      return res.sendStatus(401);
    }
    next();
  };
}

export function requirePermission(permissions: PermissionString[]): Handler {
  return (req, res, next) =>
    requireAuthenticated()(req, res, async () => {
      const { guildId, channelId = undefined } = req.params;
      const { id } = req.user as User;

      if (await hasPermissions(permissions, id, guildId, channelId)) {
        return next();
      }
      res.sendStatus(403);
    });
}

export function requireModeratorAccess() {
  return requirePermission(MODERATOR_ACCESS_PERMISSIONS);
}
