import { Router } from "express";
import asyncHandler from "express-async-handler";
import { ChannelLogsQueryOptions, User } from "discord.js";
import {
  hasModeratorAccess,
  requireAuthenticated,
  requireModeratorAccess,
} from "../oauth/helpers";
import {
  fetchGuilds,
  fetchGuildTextChannels,
  fetchMember,
  fetchMessages,
  fetchUser,
} from "./model";

const router = Router();
router.use(requireAuthenticated());

router.post(
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

router.post(
  "/channels/list",
  requireModeratorAccess(),
  asyncHandler(async (req, res) => {
    const user = req.user as User;

    const { guildId } = req.body;

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

router.post(
  "/messages/fetch",
  requireModeratorAccess(),
  asyncHandler(async (req, res) => {
    const { guildId, channelId, options = undefined } = req.body;

    const messages = await fetchMessages(guildId, channelId, options);

    res.send(messages);
  })
);

router.post(
  "/users/current",
  asyncHandler(async (req, res) => {
    const { id } = req.user as User;
    const user = await fetchUser(id);
    res.send(user);
  })
);

router.post(
  "/members",
  requireModeratorAccess(),
  asyncHandler(async (req, res) => {
    const { guildId, memberId } = req.body;
    const member = await fetchMember(guildId, memberId);
    res.send(member);
  })
);

export default router;
