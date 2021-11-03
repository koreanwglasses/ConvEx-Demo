import { Router } from "express";
import asyncHandler from "express-async-handler";
import { PermissionString, User } from "discord.js";
import { client } from "./bot";

const router = Router();

router.get("/guilds/list", (req, res) => {
  return res.send(client.guilds.cache);
});

router.get(
  "/user/current",
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
