import passport from "passport";
import { Strategy } from "passport-discord";
import config from "../config";
import { baseURL } from "../utils";
import { callbackPath } from "./router";

export function setupPassport() {
  const { clientID, clientSecret } = config.discord;

  if (!clientID)
    throw new Error(
      "Cannot setup passport with Discord. Please set the environment variable " +
        "DISCORD_OAUTH_CLIENT_ID to a valid OAuth client ID."
    );
  if (!clientSecret)
    throw new Error(
      "Cannot setup passport with Discord. Please set the environment variable " +
        "DISCORD_OAUTH_CLIENT_SECRET to a valid OAuth client secret."
    );

  passport.serializeUser((user, done) => done(null, user));
  passport.deserializeUser((obj, done) => done(null, obj));
  passport.use(
    new Strategy(
      {
        clientID,
        clientSecret,
        callbackURL: baseURL() + callbackPath,
        scope: ["identify", "guilds"],
      },
      (accessToken, refreshToken, profile, done) => {
        return done(null, profile);
      }
    )
  );
}
