import * as DiscordBot from "./discord/client";
import * as PerspectiveClient from "./analysis/perspective-client";
import * as Database from "./database";
import * as BackgroundAnalysis from "./analysis/background-analyzer/analyzer-client";
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

  console.log("Starting background analysis...");
  BackgroundAnalysis.start();

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
