import { Router } from "express";
import { requireModeratorAccess } from "../oauth/helpers";
import asyncHandler from "express-async-handler";
import { update } from "./model";

const router = Router();

router.post(
  "/guild",
  requireModeratorAccess(),
  asyncHandler(async (req, res) => {
    const { guildId, options } = req.body;
    res.send(await update(guildId, options));
  })
);

export default router;
