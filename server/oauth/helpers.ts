import { PermissionString, User } from "discord.js";
import { Handler } from "express";
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

export function requireAuthenticated(): Handler {
  return (req, res, next) => {
    if (req.isUnauthenticated()) {
      res.sendStatus(401);
      return;
    }
    next();
  };
}

export function requirePermission(...permission: PermissionString[]): Handler {
  return (req, res, next) =>
    requireAuthenticated()(req, res, async () => {
      const { guildId, channelId = undefined } = req.body;
      const { id } = req.user as User;

      for (const p of permission) {
        if (!(await hasPermission(p, id, guildId, channelId))) {
          res.sendStatus(401);
          return;
        }
      }

      next();
    });
}
