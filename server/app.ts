import express from "express";
import DiscordRouter from "./discord/router";
import AuthRouter from "./oauth/router";
import session from "express-session";
import createMemoryStore from "memorystore";
import config from "./config";
import passport from "passport";
import { setupPassport } from "./oauth/middlewares";
import { resolve } from "path";

const app = express();

/////////////////
// MIDDLEWARES //
/////////////////

app.use(express.json());

const MemoryStore = createMemoryStore(session);
app.use(
  session({
    store: new MemoryStore({ checkPeriod: 86400000 }),
    secret: config.express.sessionSecret,
    resave: false,
    saveUninitialized: false,
  })
);

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

app.use(express.static(resolve(__dirname, "client/build")));
app.get("*", (req, res) => {
  res.sendFile(resolve(__dirname, "client/build/index.html"));
});

export default app;
