import { Router } from "express";
import { fetchUser, listGuilds } from "./model";
import asyncHandler from "express-async-handler";
import { User } from "discord.js";

const router = Router();

router.get("/guilds/list", (req, res) => {
  const guilds = listGuilds();
  return res.send(guilds);
});

router.get(
  "/user/current",
  asyncHandler(async (req, res) => {
    if (req.isUnauthenticated()) {
      res.sendStatus(401);
      return;
    }

    const { id } = req.user as User;
    const user = await fetchUser(id);
    res.send(user);
  })
);

export default router;
