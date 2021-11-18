import * as DiscordBot from "./discord/client";
import * as PerspectiveClient from "./analysis/toxicity/perspective-client";
import * as Database from "./database";
import * as BackgroundListener from "./analysis/background-listener";
import * as Sockets from "./sockets";
import mongoose from "mongoose";
import app from "./app";
import config from "./config";
import { baseURL } from "./utils";

(async () => {
  console.log("Initializing clients...");
  await DiscordBot.init();
  PerspectiveClient.init();

  console.log("Connecting to database...");
  await Database.init();

  console.log("Listening for events to analyze...");
  BackgroundListener.start();

  console.log("Starting server...");
  const { port } = config.server;
  const server = app.listen(port, () => {
    console.log(`Server is up at ${baseURL()}`);
  });
  Sockets.mount(server);

  process.once("SIGINT", async () => {
    console.log("Shutting down...");
    server.close(() => {
      console.log("express server closed");
    });

    await mongoose.disconnect();
    console.log("mongoose disconnected");
  });
})();
