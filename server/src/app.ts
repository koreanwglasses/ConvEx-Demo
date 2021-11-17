import express from "express";
import DiscordRouter from "./discord/router";
import AnalysisRouter from "./analysis/router";
import AuthRouter from "./oauth/router";
import session from "express-session";
import config from "./config";
import passport from "passport";
import { setupPassport } from "./oauth/middlewares";
import { resolve } from "path";
import { dirname } from "path";
import { fileURLToPath } from "url";
const __dirname = dirname(fileURLToPath(import.meta.url));
import { store } from "./database";

const app = express();

/////////////////
// MIDDLEWARES //
/////////////////

app.use(express.json());

export const sessionMiddleware = session({
  store,
  secret: config.server.sessionSecret,
  resave: false,
  saveUninitialized: false,
});
app.use(sessionMiddleware);

app.use(passport.initialize());
app.use(passport.session());
setupPassport();

////////////
// ROUTES //
////////////

app.use(AuthRouter);
app.get("/invite", (req, res) => {
  const url = `https://discord.com/api/oauth2/authorize?client_id=${config.discord.clientID}&permissions=66560&scope=bot`;
  res.redirect(url);
});

app.use("/api", DiscordRouter);
app.use("/api", AnalysisRouter);

app.use(express.static(resolve(__dirname, "../public")));
app.get("*", (req, res) => {
  res.sendFile(resolve(__dirname, "../public/index.html"));
});

export default app;
