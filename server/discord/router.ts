import { Router } from "express";
import asyncHandler from "express-async-handler";
import { PermissionString, User } from "discord.js";
import { client } from "./bot";
import {
  hasModeratorAccess,
  requireAuthenticated,
  requirePermission,
} from "../oauth/helpers";

const router = Router();

router.get(
  "/guilds/list",
  requireAuthenticated(),
  asyncHandler(async (req, res) => {
    const user = req.user as User;

    const guilds_ = client.guilds.cache.map((guild) =>
      Promise.all([guild, hasModeratorAccess(user.id, guild.id)])
    );
    const guilds = (await Promise.all(guilds_))
      .filter(([guild, hasAccess]) => hasAccess)
      .map(([guild]) => guild);

    res.send(guilds);
  })
);

router.get(
  "/user/current",
  requireAuthenticated(),
  asyncHandler(async (req, res) => {
    if (req.isUnauthenticated()) {
      res.sendStatus(401);
      return;
    }

    const { id } = req.user as User;
    const user = await client.users.fetch(id);
    res.send(user);
  })
);

export default router;
