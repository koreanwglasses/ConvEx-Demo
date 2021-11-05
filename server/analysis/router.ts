import { User } from "discord.js";
import { Router } from "express";
import expressAsyncHandler from "express-async-handler";
import { fetchMessage } from "../discord/model";
import { hasModeratorAccess, requireAuthenticated } from "../oauth/helpers";
import { analyze } from "./model";

const router = Router();

router.post(
  "/analyze",
  requireAuthenticated(),
  expressAsyncHandler(async (req, res) => {
    const userId = (req.user as User).id;

    const { messageIds } = req.body as {
      messageIds: { guildId: string; channelId: string; messageId: string }[];
    };

    const messages = await Promise.all(
      messageIds.map(async ({ guildId, channelId, messageId }) => {
        if (!hasModeratorAccess(userId, guildId, channelId)) return null;
        const message = await fetchMessage(guildId, channelId, messageId);
        return message.cleanContent;
      })
    );

    const analyses = await Promise.all(messages.map(analyze));

    res.send(analyses);
  })
);

export default router;
