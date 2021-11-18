import { User } from "discord.js";
import { Router } from "express";
import expressAsyncHandler from "express-async-handler";
import {
  hasModeratorAccess,
  requireAuthenticated,
  requireModeratorAccess,
} from "../oauth/helpers";
import { computeAggregate } from "./aggregate/aggregate-model";
import { analyzeMessage } from "./analysis-model";

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

router.post(
  "/aggregate",
  requireModeratorAccess(),
  expressAsyncHandler(async (req, res) => {
    const {
      guildId,
      channelId,
      start,
      end,
      intervalUnit,
      intervalStep,
      toxicityThreshold,
    } = req.body;
    const aggregate = await computeAggregate({
      guildId,
      channelId,
      start,
      end,
      intervalUnit,
      intervalStep,
      toxicityThreshold,
    });
    res.send(aggregate);
  })
);

export default router;
