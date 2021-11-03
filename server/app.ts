import express from "express";
import DiscordRouter from "./discord/router";
import AuthRouter from "./oauth/router";
import session from "express-session";
import createMemoryStore from "memorystore";
import config from "./config";
import passport from "passport";
import { setupPassport } from "./oauth/middlewares";

const app = express();

/////////////////
// MIDDLEWARES //
/////////////////

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
app.use("/api", DiscordRouter);

export default app;
