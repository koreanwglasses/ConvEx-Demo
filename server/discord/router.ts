import { Router } from "express";
import asyncHandler from "express-async-handler";
import { User } from "discord.js";
import { client } from "./bot";
import {
  hasModeratorAccess,
  requireAuthenticated,
  requireModeratorAccess,
} from "../oauth/helpers";
import { fetchGuilds, fetchGuildTextChannels, fetchUser } from "./model";

const router = Router();

router.use(requireAuthenticated());

router.get(
  "/guilds/list",
  asyncHandler(async (req, res) => {
    const user = req.user as User;

    const guilds__ = await fetchGuilds();
    const guilds_ = guilds__.map((guild) =>
      Promise.all([guild, hasModeratorAccess(user.id, guild.id)])
    );
    const guilds = (await Promise.all(guilds_))
      .filter(([guild, hasAccess]) => hasAccess)
      .map(([guild]) => guild);

    res.send(guilds);
  })
);

router.get(
  "/guild/:guildId/channels",
  requireModeratorAccess(),
  asyncHandler(async (req, res) => {
    const user = req.user as User;

    const { guildId } = req.params;

    const channels__ = await fetchGuildTextChannels(guildId);
    const channels_ = channels__.map((channel) =>
      Promise.all([channel, hasModeratorAccess(user.id, guildId, channel.id)])
    );
    const channels = (await Promise.all(channels_))
      .filter(([channel, hasAccess]) => hasAccess)
      .map(([channel]) => channel);

    res.send(channels);
  })
);

router.get(
  "/user/current",
  asyncHandler(async (req, res) => {
    const { id } = req.user as User;
    const user = fetchUser(id);
    res.send(user);
  })
);

export default router;
