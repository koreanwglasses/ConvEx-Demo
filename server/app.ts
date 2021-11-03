import express from "express";
import DiscordRouter from "./discord/router";
import session from "express-session";
import createMemoryStore from "memorystore";
import config from "./config";
import passport from "passport";
import * as auth from "./discord/auth";

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
auth.setupPassport();

////////////
// ROUTES //
////////////

app.use(auth.router);
app.use("/api", DiscordRouter);

export default app;
