import { User } from "discord.js";
import { Router } from "express";
import expressAsyncHandler from "express-async-handler";
import { hasModeratorAccess, requireAuthenticated } from "../oauth/helpers";
import { analyzeMessage } from "./model";

const router = Router();

router.post(
  "/analyze",
  requireAuthenticated(),
  expressAsyncHandler(async (req, res) => {
    const userId = (req.user as User).id;

    const { messageIds } = req.body as {
      messageIds: { guildId: string; channelId: string; messageId: string }[];
    };

    const analyses = await Promise.all(
      messageIds.map(async ({ guildId, channelId, messageId }) => {
        if (!hasModeratorAccess(userId, guildId, channelId)) return null;
        return analyzeMessage(guildId, channelId, messageId);
      })
    );

    res.send(analyses);
  })
);

export default router;
