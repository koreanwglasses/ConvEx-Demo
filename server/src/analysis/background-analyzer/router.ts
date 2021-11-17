import { Router } from "express";
import { requireModeratorAccess } from "../../oauth/helpers";
import expressAsyncHandler from "express-async-handler";
import { fetchAnalysisSummaries } from "./analysis-summary-model";

const router = Router();

router.post(
  "/summaries",
  requireModeratorAccess(),
  expressAsyncHandler(async (req, res) => {
    const { guildId, channelId, start, end } = req.body;
    const summaries = await fetchAnalysisSummaries({
      guildId,
      channelId,
      start,
      end,
    });
    res.send(summaries);
  })
);

export default router;
