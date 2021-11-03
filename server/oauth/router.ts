import { Router } from "express";
import passport from "passport";

const router = Router();

router.get("/auth", passport.authenticate("discord"));

export const callbackPath = "/return";
router.get(callbackPath, passport.authenticate("discord"), (req, res) =>
  res.redirect("/api/user/current")
);

router.get("/logout", (req, res) => {
  req.logout();
});

export default router;
