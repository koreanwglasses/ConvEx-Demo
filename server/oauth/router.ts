import { Router } from "express";
import passport from "passport";

const router = Router();

router.get(
  "/auth",
  (req, res, next) => {
    req.session.origin = req.body?.origin;
    next()
  },
  passport.authenticate("discord")
);

export const callbackPath = "/return";
router.get(callbackPath, passport.authenticate("discord"), (req, res) => {
  if (req.isAuthenticated()) {
    return res.redirect(req.session.origin ?? "/");
  } else return res.sendStatus(401);
});

router.get("/logout", (req, res) => {
  req.logout();
});

export default router;
